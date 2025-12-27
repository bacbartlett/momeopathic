import { v } from "convex/values";
import { query, action } from "./_generated/server";
import { listUIMessages } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { homeopathicAgent } from "./agents/homeopathic";
import { paginationOptsValidator } from "convex/server";

// List messages in a thread (UI-formatted)
export const list = query({
  args: {
    threadId: v.string(),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const result = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts ?? { cursor: null, numItems: 50 },
    });
    return result;
  },
});

// Send a message and get a response from the agent
export const send = action({
  args: {
    threadId: v.string(),
    content: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await homeopathicAgent.generateText(
      ctx,
      { threadId: args.threadId, userId: args.userId },
      { prompt: args.content }
    );
    return {
      text: result.text,
      messageId: result.messageId,
    };
  },
});
