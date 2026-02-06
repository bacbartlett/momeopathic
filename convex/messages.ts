import { createOpenAI } from "@ai-sdk/openai";
import { listMessages, toUIMessages } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { action, query } from "./_generated/server";
import { homeopathicAgent } from "./agents/homeopathic";
import { generateConversationTitle } from "./agents/titleGenerator";

// Cheap/fast model for post-generation dedup checks
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/**
 * Strip tool-related content from messages for clean UI display.
 * - Removes role:"tool" messages (raw tool results)
 * - Strips type:"tool-call" content parts from assistant messages (keeps text)
 * - Preserves the `tool` flag so toUIMessages grouping stays correct
 */
function stripToolContentForUI(messages: Array<Record<string, any>>) {
  return messages
    .filter((msg) => msg.message?.role !== "tool")
    .map((msg) => {
      if (!msg.tool || msg.message?.role !== "assistant") return msg;
      const content = msg.message.content;
      if (!Array.isArray(content)) return msg;
      const textParts = content.filter(
        (part: { type: string }) => part.type !== "tool-call"
      );
      // Drop assistant messages that had only tool-calls and no text
      if (textParts.length === 0) return null;
      return { ...msg, message: { ...msg.message, content: textParts } };
    })
    .filter(Boolean);
}

/**
 * After multi-step tool calling, the assistant's text may be split across
 * steps with the model repeating itself. This sends the concatenated text
 * to a cheap/fast LLM that checks for repetition and returns a cleaned
 * version. If cleaned, we update the final message and clear intermediates
 * so the reactive query picks up the fix.
 */
/** Extract text from message content (handles string and array-of-parts formats) */
function extractTextFromContent(
  message: { role: string; content: unknown } | undefined
): string {
  if (!message) return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part: { type: string }) => part.type === "text")
    .map((part: { text: string }) => part.text)
    .join("\n");
}

// async function deduplicateAssistantResponse(
//   ctx: Parameters<typeof homeopathicAgent.updateMessage>[0],
//   threadId: string
// ): Promise<void> {
//   console.log('1')
//   // Read the actual messages from the DB (savedMessages has stale/empty content)
//   const recent = await listMessages(ctx, components.agent, {
//     threadId,
//     paginationOpts: { cursor: null, numItems: 20 },
//   });
//   console.log('2')

//   // Find the latest assistant turn's order
//   const latestAssistant = recent.page.find(
//     (msg) => msg.message?.role === "assistant"
//   );
//   if (!latestAssistant) return;
//   const currentOrder = latestAssistant.order;
//   console.log('3', 'currentOrder:', currentOrder)

//   // Get all assistant messages from this turn, extract their text
//   const assistantMsgsWithText = recent.page
//     .filter(
//       (msg) => msg.message?.role === "assistant" && msg.order === currentOrder
//     )
//     .map((msg) => ({
//       _id: msg._id,
//       extractedText: (msg.text || extractTextFromContent(msg.message)).trim(),
//     }))
//     .filter((msg) => msg.extractedText.length > 0);

//   console.log('4', 'assistantMsgsWithText.length:', assistantMsgsWithText.length)
//   for (const msg of assistantMsgsWithText) {
//     console.log('[DEDUP] assistant msg:', {
//       _id: msg._id,
//       textPreview: msg.extractedText.slice(0, 200),
//     });
//   }

//   // Only one or zero text steps — no possible cross-step duplication
//   if (assistantMsgsWithText.length <= 1) return;
//   console.log('5')

//   const concatenated = assistantMsgsWithText
//     .map((m) => m.extractedText)
//     .join("\n\n");

//   console.log('concat:', concatenated)

//   try {
//     const { text: result } = await aiGenerateText({
//       model: openrouter.chat("google/gemini-2.5-flash-lite"),
//       prompt: `You are a text deduplication tool. The text below was composed in multiple parts and may contain sentences or paragraphs that repeat the same information.

// Rules:
// - If repetitive content exists: remove the duplicate, keeping the most complete version of each point. Preserve all markdown formatting, links, and structure exactly.
// - If NO repetition exists: respond with exactly NO_CHANGE (nothing else).

// Text:
// """
// ${concatenated}
// """`,
//     });

//     const cleaned = result?.trim();
//     console.log("[DEDUP] Input:\n", concatenated);
//     console.log("[DEDUP] Output:\n", cleaned);
//     if (!cleaned || cleaned === "NO_CHANGE") return;

//     // Put the full cleaned text on the final assistant message
//     const finalMsg = assistantMsgsWithText[assistantMsgsWithText.length - 1];
//     await homeopathicAgent.updateMessage(ctx, {
//       messageId: finalMsg._id,
//       patch: {
//         message: { role: "assistant", content: cleaned },
//         status: "success",
//       },
//     });

//     // Clear intermediate assistant step text so concatenation doesn't re-duplicate
//     for (const msg of assistantMsgsWithText.slice(0, -1)) {
//       await homeopathicAgent.updateMessage(ctx, {
//         messageId: msg._id,
//         patch: {
//           message: { role: "assistant", content: [] },
//           status: "success",
//         },
//       });
//     }
//   } catch (error) {
//     // Non-fatal: duplicated text is better than a failed message send
//     console.error("Dedup check failed:", error);
//   }
// }

// List messages in a thread (UI-formatted)
// Only allows access if the thread belongs to the authenticated user
export const list = query({
  args: {
    threadId: v.string(),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return empty result during auth race condition - client will retry once authenticated
      // This handles the brief window where client thinks it's authenticated but JWT hasn't propagated
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Get the user from the database
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found in database");
    }

    // Get the thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    // If thread doesn't exist, return empty result set
    if (!thread) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Verify the thread belongs to the authenticated user
    if (thread.userId !== user._id) {
      // Return empty result set instead of throwing error for better UX
      return { page: [], isDone: true, continueCursor: "" };
    }

    const result = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts ?? { cursor: null, numItems: 50 },
    });
    const cleaned = stripToolContentForUI(result.page);
    return { ...result, page: toUIMessages(cleaned as typeof result.page) };
  },
});

// Maximum message length (10KB)
const MAX_MESSAGE_LENGTH = 10240;

// Send a message and get a response from the agent
// Only allows sending to threads owned by the authenticated user
export const send = action({
  args: {
    threadId: v.string(),
    content: v.string(),
  },
  returns: v.object({
    text: v.string(),
    messageId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Validate input length
    if (args.content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.`);
    }
    if (args.content.trim().length === 0) {
      throw new Error("Message cannot be empty.");
    }
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Must be logged in to send messages");
    }

    // Get the thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    // The thread.userId should match the user's database _id
    // We verify through the thread ownership check

    // Check if this is the first user message (thread title is still default)
    const isFirstUserMessage = !thread.title || thread.title === "New Chat";

    console.log("[SEND] Calling generateText for thread:", args.threadId, "prompt:", args.content.slice(0, 100));

    const result = await homeopathicAgent.generateText(
      ctx,
      { threadId: args.threadId, userId: thread.userId },
      { prompt: args.content }
    );

    // --- DEBUG LOGGING ---
    console.log("[RESULT] finishReason:", result.finishReason);
    console.log("[RESULT] text length:", result.text?.length ?? 0);
    console.log("[RESULT] text preview:", result.text?.slice(0, 200));

    // Tool calls
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log("[RESULT] toolCalls count:", result.toolCalls.length);
      for (const tc of result.toolCalls) {
        const t = tc as any;
        console.log("[RESULT] toolCall:", JSON.stringify({
          toolName: t.toolName,
          args: t.args,
          toolCallId: t.toolCallId,
        }));
      }
    } else {
      console.log("[RESULT] No tool calls in final step");
    }

    // Tool results
    if (result.toolResults && result.toolResults.length > 0) {
      console.log("[RESULT] toolResults count:", result.toolResults.length);
      for (const tr of result.toolResults) {
        const t = tr as any;
        console.log("[RESULT] toolResult:", JSON.stringify({
          toolName: t.toolName,
          toolCallId: t.toolCallId,
          resultPreview: typeof t.result === "string" ? t.result.slice(0, 200) : JSON.stringify(t.result).slice(0, 200),
        }));
      }
    }

    // Usage / reasoning tokens
    if (result.usage) {
      console.log("[RESULT] usage:", JSON.stringify(result.usage));
    }

    // Reasoning (check result and providerMetadata)
    if ((result as any).reasoning) {
      console.log("[RESULT] reasoning:", (result as any).reasoning);
    }
    if ((result as any).reasoningDetails) {
      console.log("[RESULT] reasoningDetails:", JSON.stringify((result as any).reasoningDetails));
    }
    if ((result as any).providerMetadata) {
      console.log("[RESULT] providerMetadata:", JSON.stringify((result as any).providerMetadata));
    }

    // Saved messages - inspect for tool flags, reasoning, and step ordering
    if (result.savedMessages && result.savedMessages.length > 0) {
      console.log("[RESULT] savedMessages count:", result.savedMessages.length);
      for (const msg of result.savedMessages) {
        console.log("[SAVED MSG]", JSON.stringify({
          _id: msg._id,
          role: msg.message?.role,
          tool: msg.tool,
          stepOrder: msg.stepOrder,
          order: msg.order,
          status: msg.status,
          finishReason: msg.finishReason,
          textPreview: (msg.text || "").slice(0, 150),
          hasReasoning: !!msg.reasoning,
          reasoning: msg.reasoning ? msg.reasoning.slice(0, 300) : null,
          reasoningDetails: msg.reasoningDetails ? JSON.stringify(msg.reasoningDetails).slice(0, 300) : null,
          usage: msg.usage ?? null,
          contentType: msg.message?.content ? (typeof msg.message.content === "string" ? "string" : "array[" + (msg.message.content as any[]).length + "]") : "none",
        }));
      }
    }

    console.log("[SEND] Generation complete for thread:", args.threadId);
    // --- END DEBUG LOGGING ---

    // Generate and update thread title if this is the first user message
    if (isFirstUserMessage) {
      try {
        const generatedTitle = await generateConversationTitle(args.content);
        await ctx.runMutation(components.agent.threads.updateThread, {
          threadId: args.threadId,
          patch: {
            title: generatedTitle,
          },
        });
      } catch (error) {
        // Log error but don't fail the message send
        console.error("Failed to generate thread title:", error);
      }
    }

    return {
      text: result.text,
      messageId: result.messageId,
    };
  },
});
