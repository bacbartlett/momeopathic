import { listMessages, toUIMessages } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { action, ActionCtx, query, QueryCtx } from "./_generated/server";
import { homeopathicAgent } from "./agents/homeopathic";
import { generateConversationTitle } from "./agents/titleGenerator";

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
 * Resolve user from query context. Tries Clerk auth first, falls back to guestId.
 */
async function resolveUserFromQuery(
  ctx: QueryCtx,
  guestId?: string
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (user) return user;
  }

  if (guestId) {
    const guest = await ctx.db
      .query("users")
      .withIndex("by_guestId", (q) => q.eq("guestId", guestId))
      .unique();
    if (guest) return guest;
  }

  throw new Error("Unauthenticated: Must be logged in or have a guest session");
}

/**
 * Resolve user from action context. Tries Clerk auth first, falls back to guestId.
 */
async function resolveUserFromAction(
  ctx: ActionCtx,
  guestId?: string
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.runQuery(internal.threads.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (user) return user;
  }

  if (guestId) {
    const user = await ctx.runQuery(internal.threads.getGuestUserByGuestId, {
      guestId,
    });
    if (user) return user;
  }

  throw new Error("Unauthenticated: Must be logged in or have a guest session");
}

// List messages in a thread (UI-formatted)
// Only allows access if the thread belongs to the user
export const list = query({
  args: {
    threadId: v.string(),
    paginationOpts: v.optional(paginationOptsValidator),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Try to resolve user
    let user: Doc<"users"> | null = null;
    try {
      user = await resolveUserFromQuery(ctx, args.guestId);
    } catch {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Get the thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    if (thread.userId !== user._id) {
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
// Only allows sending to threads owned by the user
export const send = action({
  args: {
    threadId: v.string(),
    content: v.string(),
    guestId: v.optional(v.string()),
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

    const user = await resolveUserFromAction(ctx, args.guestId);

    // Rate limit check
    const rateLimit = await ctx.runQuery(internal.rateLimit.checkRateLimit, {
      userId: user._id,
    });
    if (!rateLimit.allowed) {
      throw new Error("Slow down! You're sending messages too quickly. Please wait a moment.");
    }

    // Get the thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    if (thread.userId !== user._id) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    // Record this message for rate limiting
    await ctx.runMutation(internal.rateLimit.recordMessage, {
      userId: user._id,
    });

    // Check if this is the first user message (thread title is still default)
    const isFirstUserMessage = !thread.title || thread.title === "New Chat";

    const result = await homeopathicAgent.generateText(
      ctx,
      { threadId: args.threadId, userId: thread.userId },
      { prompt: args.content }
    );

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
      } catch {
        // Title generation is non-critical, continue silently
      }
    }

    // Record activity for greeting system
    await ctx.runMutation(internal.greetings.recordActivity, {
      userId: user._id,
    });

    return {
      text: result.text,
      messageId: result.messageId,
    };
  },
});
