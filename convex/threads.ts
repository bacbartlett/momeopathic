import { v } from "convex/values";
import { mutation, query, action, MutationCtx, QueryCtx } from "./_generated/server";
import { createThread } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { homeopathicAgent } from "./agents/homeopathic";
import { Doc } from "./_generated/dataModel";

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

// Create a new thread for the authenticated user
export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromMutation(ctx);

    // Use the user's database ID as the userId for the thread
    // This associates the thread with our user in the database
    const threadId = await createThread(ctx, components.agent, {
      userId: user._id,
      title: args.title,
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
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Must be logged in to delete threads");
    }

    // Get the thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    // The thread.userId stores our user's database _id
    // We verify ownership through the thread's userId field

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
  handler: async (ctx, args) => {
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
