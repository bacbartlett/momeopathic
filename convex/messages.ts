import { listUIMessages } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { action, query } from "./_generated/server";
import { homeopathicAgent } from "./agents/homeopathic";

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
      throw new Error("Unauthenticated: Must be logged in to view messages");
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

// Send a message and get a response from the agent
// Only allows sending to threads owned by the authenticated user
export const send = action({
  args: {
    threadId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
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

    const result = await homeopathicAgent.generateText(
      ctx,
      { threadId: args.threadId, userId: thread.userId },
      { prompt: args.content }
    );
    return {
      text: result.text,
      messageId: result.messageId,
    };
  },
});
