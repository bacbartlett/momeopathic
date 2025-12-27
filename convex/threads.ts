import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "./_generated/server";
import { createThread } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { homeopathicAgent } from "./agents/homeopathic";

// Create a new thread
export const create = mutation({
  args: {
    userId: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const threadId = await createThread(ctx, components.agent, {
      userId: args.userId,
      title: args.title,
    });
    return { threadId };
  },
});

// List all threads for a user (using component's internal query)
export const list = query({
  args: {
    userId: v.optional(v.string()),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: args.userId,
        paginationOpts: args.paginationOpts ?? { cursor: null, numItems: 50 },
      }
    );
    return threads;
  },
});

// Get a specific thread (using component's internal query)
export const get = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    return thread;
  },
});

// Delete a thread
export const remove = action({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    await homeopathicAgent.deleteThreadSync(ctx, { threadId: args.threadId });
    return { success: true };
  },
});

// Update thread metadata (title/summary)
export const updateMetadata = mutation({
  args: {
    threadId: v.string(),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
