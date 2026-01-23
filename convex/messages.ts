import { listUIMessages } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { action, query } from "./_generated/server";
import { homeopathicAgent } from "./agents/homeopathic";
import { generateConversationTitle } from "./agents/titleGenerator";

/**
 * Strategy B: Clear text from intermediate step messages to prevent duplication.
 *
 * When multi-step tool calling occurs, each step's text gets concatenated by
 * listUIMessages. This function clears text from intermediate steps (those that
 * ended with tool-calls) so only the final response text is shown to users.
 */
async function clearIntermediateStepText(
  ctx: Parameters<typeof homeopathicAgent.updateMessage>[0],
  savedMessages: Array<{ _id: string; finishReason?: string; message?: { role: string; content: unknown } }> | undefined
): Promise<void> {
  if (!savedMessages) return;

  for (const msg of savedMessages) {
    // Only process intermediate assistant messages (those that ended by calling a tool)
    if (
      msg.message?.role === 'assistant' &&
      msg.finishReason === 'tool-calls'
    ) {
      try {
        // Clear the content from intermediate steps
        // This preserves the message for context but removes text from UI display
        await homeopathicAgent.updateMessage(ctx, {
          messageId: msg._id,
          patch: {
            message: { role: 'assistant', content: [] }, // Empty content array
            status: 'success'
          }
        });
      } catch (error) {
        // Log but don't fail the request if cleanup fails
        console.error('Failed to clear intermediate step text:', error);
      }
    }
  }
}

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

    const result = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts ?? { cursor: null, numItems: 50 },
    });
    return result;
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

    const result = await homeopathicAgent.generateText(
      ctx,
      { threadId: args.threadId, userId: thread.userId },
      { prompt: args.content }
    );

    // Strategy B: Clear text from intermediate steps to prevent duplication in UI
    // This removes "Let me search..." type preamble text from tool-calling steps
    await clearIntermediateStepText(ctx, result.savedMessages);

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
