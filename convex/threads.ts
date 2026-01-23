import { saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { action, ActionCtx, internalAction, internalQuery, mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { homeopathicAgent } from "./agents/homeopathic";

/**
 * Helper function to get the current authenticated user from a mutation context.
 * Throws an error if the user is not authenticated or doesn't exist in the database.
 */
async function getCurrentUserFromMutation(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: Must be logged in to access threads");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) {
    throw new Error("User not found in database. Please sign in again.");
  }

  return user;
}

/**
 * Internal query to get user by token identifier.
 * Used by actions that need to look up the current user (actions can't access db directly).
 */
export const getUserByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();
  },
});

/**
 * Helper function to get the current authenticated user from an action context.
 * Throws an error if the user is not authenticated or doesn't exist in the database.
 */
async function getCurrentUserFromAction(ctx: ActionCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: Must be logged in to access threads");
  }

  // Actions can't access db directly, must use runQuery
  const user = await ctx.runQuery(internal.threads.getUserByToken, {
    tokenIdentifier: identity.tokenIdentifier,
  });

  if (!user) {
    throw new Error("User not found in database. Please sign in again.");
  }

  return user;
}

/**
 * Helper function to get the current authenticated user from a query context.
 * Throws an error if the user is not authenticated or doesn't exist in the database.
 */
async function getCurrentUserFromQuery(ctx: QueryCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: Must be logged in to access threads");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) {
    throw new Error("User not found in database. Please sign in again.");
  }

  return user;
}

/**
 * Helper function to check if a thread is empty (has no user messages).
 * Returns true if the thread only contains assistant/system messages.
 */
async function isThreadEmpty(ctx: ActionCtx, threadId: string): Promise<boolean> {
  try {
    const messages = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        threadId,
        order: "asc",
        paginationOpts: { cursor: null, numItems: 100 },
        excludeToolMessages: false,
      }
    );

    // Check if there are any user messages
    // The message structure has a nested message object with role field
    const hasUserMessage = messages.page.some((msg) => {
      if (!msg.message || typeof msg.message !== "object") {
        return false;
      }
      // Type guard to check if message has role property
      if ("role" in msg.message) {
        return msg.message.role === "user";
      }
      return false;
    });

    return !hasUserMessage;
  } catch (error) {
    // If we can't check messages, assume thread is not empty to be safe
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
    userId: v.string(),
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
        }
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
          // Log but don't fail cleanup if a single thread deletion fails
          console.error(`Error deleting empty thread ${emptyThreads[i].id}:`, error);
        }
      }
    } catch (error) {
      // Log but don't fail - this is a background cleanup task
      console.error("Error during empty thread cleanup:", error);
    }
    return null;
  },
});

// Maximum length for title and summary
const MAX_TITLE_LENGTH = 200;
const MAX_SUMMARY_LENGTH = 1000;

// Create a new thread for the authenticated user
// Converted to action to allow adding initial greeting message
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
      throw new Error(`Title too long. Maximum length is ${MAX_TITLE_LENGTH} characters.`);
    }
    const user = await getCurrentUserFromAction(ctx);

    // Create thread using the agent's createThread method which returns both threadId and thread object
    const { threadId } = await homeopathicAgent.createThread(ctx, {
      userId: user._id,
      title: args.title,
    });

    // Add initial greeting message from the AI directly as an assistant message
    await saveMessage(ctx, components.agent, {
      threadId,
      userId: user._id,
      message: {
        role: "assistant",
        content: "Hello, how can I help you today?",
      },
    });

    // Schedule cleanup of empty threads to run immediately after this action completes
    // Using runAfter(0) ensures proper execution without dangling promises
    // Keeps only the most recently created empty thread (which will be the one just created)
    await ctx.scheduler.runAfter(0, internal.threads.cleanupEmptyThreads, {
      userId: user._id,
    });

    return { threadId };
  },
});

// List all threads for the authenticated user
export const list = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return empty list for unauthenticated users
      return { page: [], isDone: true, continueCursor: "" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      // User not in database yet - return empty list
      return { page: [], isDone: true, continueCursor: "" };
    }

    // List threads filtering by the user's database ID
    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: user._id,
        paginationOpts: args.paginationOpts ?? { cursor: null, numItems: 50 },
      }
    );
    return threads;
  },
});

// Get a specific thread (only if it belongs to the authenticated user)
export const get = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromQuery(ctx);

    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    // Verify the thread belongs to the authenticated user
    if (thread && thread.userId !== user._id) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    return thread;
  },
});

// Delete a thread (only if it belongs to the authenticated user)
export const remove = action({
  args: {
    threadId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromAction(ctx);

    // Get the thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    // Verify the thread belongs to the authenticated user
    if (thread.userId !== user._id) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    await homeopathicAgent.deleteThreadSync(ctx, { threadId: args.threadId });
    return { success: true };
  },
});

// Update thread metadata (title/summary) - only if owned by authenticated user
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
    // Validate title length if provided
    if (args.title && args.title.length > MAX_TITLE_LENGTH) {
      throw new Error(`Title too long. Maximum length is ${MAX_TITLE_LENGTH} characters.`);
    }
    // Validate summary length if provided
    if (args.summary && args.summary.length > MAX_SUMMARY_LENGTH) {
      throw new Error(`Summary too long. Maximum length is ${MAX_SUMMARY_LENGTH} characters.`);
    }
    const user = await getCurrentUserFromMutation(ctx);

    // Get the thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    // Verify the thread belongs to the authenticated user
    if (thread.userId !== user._id) {
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
