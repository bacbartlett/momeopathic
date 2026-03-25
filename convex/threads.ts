import { getAuthUserId } from "@convex-dev/auth/server";
import { saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  action,
  ActionCtx,
  internalAction,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { homeopathicAgent } from "./agents/homeopathic";


const FIRST_TIME_GREETING = `Hi! I'm your homeopathy study partner.

I'm here to help you find the right remedy when you're not sure what to reach for, whether it's 2 PM or 2 AM.

I'm trained on Boericke's Materia Medica (the classic reference since 1927), and I'm here for anyone who wants to use homeopathy but doesn't have years to study.

You can ask me things like:
- "My toddler has a runny nose and won't stop whining"
- "What's the difference between Belladonna and Aconite?"
- "I've had a headache all day — worse in the heat"

I'm not a doctor, and I'll tell you when something needs real medical attention. But when you're wondering which remedy to reach for, I've got you.

Try it — what's going on?`;

const threadDocValidator = v.object({
  _creationTime: v.number(),
  _id: v.string(),
  status: v.union(v.literal("active"), v.literal("archived")),
  summary: v.optional(v.string()),
  title: v.optional(v.string()),
  userId: v.optional(v.string()),
});
const paginatedThreadsValidator = v.object({
  continueCursor: v.string(),
  isDone: v.boolean(),
  page: v.array(threadDocValidator),
  pageStatus: v.optional(
    v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
  ),
  splitCursor: v.optional(v.union(v.string(), v.null())),
});

// ============================================================
// Auth helpers
// ============================================================

/**
 * Get the authenticated user's ID or throw.
 * Works in queries and mutations (direct db access).
 */
async function requireAuthUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthenticated: Must be logged in");
  }
  return userId;
}

/**
 * Get the authenticated user's ID from an action context or throw.
 */
async function requireAuthUserIdFromAction(
  ctx: ActionCtx,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthenticated: Must be logged in");
  }
  return userId;
}

// ============================================================
// Thread helpers
// ============================================================

/**
 * Helper function to check if a thread is empty (has no user messages).
 * Returns true if the thread only contains assistant/system messages.
 */
async function isThreadEmpty(
  ctx: ActionCtx,
  threadId: string,
): Promise<boolean> {
  try {
    const messages = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        threadId,
        order: "asc",
        paginationOpts: { cursor: null, numItems: 100 },
        excludeToolMessages: false,
      },
    );

    // Check if there are any user messages
    const hasUserMessage = messages.page.some((msg) => {
      if (!msg.message || typeof msg.message !== "object") {
        return false;
      }
      if ("role" in msg.message) {
        return msg.message.role === "user";
      }
      return false;
    });

    return !hasUserMessage;
  } catch (error) {
    console.error(`Error checking if thread ${threadId} is empty:`, error);
    return false;
  }
}

/**
 * Internal action to cleanup empty threads for a user.
 * Scheduled to run after thread creation to avoid dangling promises.
 * Keeps the most recently created empty thread, deletes all older empty threads.
 */
export const cleanupEmptyThreads = internalAction({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Get all threads for the user
      const threadsResult = await ctx.runQuery(
        components.agent.threads.listThreadsByUserId,
        {
          userId: args.userId,
          paginationOpts: { cursor: null, numItems: 100 },
        },
      );

      // Find all empty threads
      const emptyThreads: Array<{ id: string; creationTime: number }> = [];
      for (const thread of threadsResult.page) {
        const isEmpty = await isThreadEmpty(ctx, thread._id);
        if (isEmpty) {
          emptyThreads.push({
            id: thread._id,
            creationTime: thread._creationTime,
          });
        }
      }

      // Sort by creation time descending (most recent first)
      emptyThreads.sort((a, b) => b.creationTime - a.creationTime);

      // Delete all empty threads except the most recent one
      for (let i = 1; i < emptyThreads.length; i++) {
        try {
          await homeopathicAgent.deleteThreadSync(ctx, {
            threadId: emptyThreads[i].id,
          });
        } catch (error) {
          console.error(
            `Error deleting empty thread ${emptyThreads[i].id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Error during empty thread cleanup:", error);
    }
    return null;
  },
});

// Maximum length for title and summary
const MAX_TITLE_LENGTH = 200;
const MAX_SUMMARY_LENGTH = 1000;

// Create a new thread for the authenticated user
export const create = action({
  args: {
    title: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate title length if provided
    if (args.title && args.title.length > MAX_TITLE_LENGTH) {
      throw new Error(
        `Title too long. Maximum length is ${MAX_TITLE_LENGTH} characters.`,
      );
    }
    const userId = await requireAuthUserIdFromAction(ctx);

    // Create thread using the agent's createThread method
    const { threadId } = await homeopathicAgent.createThread(ctx, {
      userId,
      title: args.title,
    });

    // Schedule cleanup of empty threads
    await ctx.scheduler.runAfter(0, internal.threads.cleanupEmptyThreads, {
      userId: userId as any,
    });

    return { threadId };
  },
});

// ============================================================
// Single-Thread Model: Get or Create
// ============================================================

// Return type for getOrCreate
interface GetOrCreateResult {
  threadId: string;
  isNew: boolean;
}

/**
 * Get the user's single thread, or create one if none exists.
 * This is the main entry point for the single-thread chat model.
 *
 * Returns:
 * - threadId: The thread to use
 * - isNew: Whether this is a brand new thread (no prior messages)
 */
export const getOrCreate = action({
  args: {},
  returns: v.object({
    threadId: v.string(),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args): Promise<GetOrCreateResult> => {
    const userId = await requireAuthUserIdFromAction(ctx);

    // Try to get existing thread
    const threadsResult = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId,
        paginationOpts: { cursor: null, numItems: 1 },
      },
    );

    // If user has a thread, return it
    if (threadsResult.page.length > 0) {
      const thread = threadsResult.page[0];
      return {
        threadId: thread._id as string,
        isNew: false,
      };
    }

    // No existing thread - create one
    const { threadId } = await homeopathicAgent.createThread(ctx, {
      userId,
      title: "Chat",
    });

    // Add initial greeting message
    await saveMessage(ctx, components.agent, {
      threadId,
      userId,
      message: {
        role: "assistant",
        content: FIRST_TIME_GREETING,
      },
    });

    // Return greeting so UI can display immediately (avoids timing issues with saveMessage)
    return {
      threadId,
      isNew: true,
    };
  },
});

// List all threads for the authenticated user
export const list = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: paginatedThreadsValidator,
  handler: async (ctx, args) => {
    let userId: string | null = null;
    try {
      userId = await requireAuthUserId(ctx);
    } catch {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // List threads filtering by the user's database ID
    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId,
        paginationOpts: args.paginationOpts ?? { cursor: null, numItems: 50 },
      },
    );
    return threads;
  },
});

// Get a specific thread (only if it belongs to the user)
export const get = query({
  args: {
    threadId: v.string(),
  },
  returns: v.union(v.null(), threadDocValidator),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    // Verify the thread belongs to the user
    if (thread && thread.userId !== userId) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    return thread ?? null;
  },
});

// Delete a thread (only if it belongs to the user)
export const remove = action({
  args: {
    threadId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserIdFromAction(ctx);

    // Get the thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    if (thread.userId !== userId) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    await homeopathicAgent.deleteThreadSync(ctx, { threadId: args.threadId });

    return { success: true };
  },
});

// Update thread metadata (title/summary) - only if owned by user
export const updateMetadata = mutation({
  args: {
    threadId: v.string(),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (args.title && args.title.length > MAX_TITLE_LENGTH) {
      throw new Error(
        `Title too long. Maximum length is ${MAX_TITLE_LENGTH} characters.`,
      );
    }
    if (args.summary && args.summary.length > MAX_SUMMARY_LENGTH) {
      throw new Error(
        `Summary too long. Maximum length is ${MAX_SUMMARY_LENGTH} characters.`,
      );
    }
    const userId = await requireAuthUserId(ctx);

    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    if (thread.userId !== userId) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: {
        title: args.title,
        summary: args.summary,
      },
    });
    return { success: true };
  },
});
