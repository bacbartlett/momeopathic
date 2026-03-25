/**
 * DEBUG ENDPOINTS
 *
 * These are for testing the greeting system and debugging message issues.
 * Gated behind DEV_MODE environment variable - set via `npx convex env set DEV_MODE true`
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { listMessages, saveMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";

// Check if we're in dev mode
const isDevMode = () => process.env.DEV_MODE === "true";

// No-op response for production
const PROD_DISABLED = { success: false, message: "Debug endpoints disabled in production" };

/**
 * Debug: Get raw messages for a thread (bypasses toUIMessages transform)
 * This helps us see exactly what's stored in the agent's message table
 */
export const getRawMessages = internalQuery({
  args: { threadId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (!isDevMode()) return [];

    const result = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: { cursor: null, numItems: 50 },
    });
    return result.page;
  },
});

/**
 * Debug: Simulate user inactivity for greeting testing
 * Sets lastActivityAt to a time in the past
 */
export const simulateInactivity = internalMutation({
  args: {
    userId: v.id("users"),
    tier: v.union(v.literal("30min"), v.literal("4hour"), v.literal("1week")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!isDevMode()) return null;

    const now = Date.now();
    const offsets = {
      "30min": 35 * 60 * 1000,
      "4hour": 5 * 60 * 60 * 1000,
      "1week": 8 * 24 * 60 * 60 * 1000,
    };

    const newLastActivity = now - offsets[args.tier];

    await ctx.db.patch(args.userId, {
      lastActivityAt: newLastActivity,
    });

    return null;
  },
});

/**
 * Debug: Public action to trigger inactivity simulation
 * Call this from the UI to test greeting tiers
 */
export const testGreetingTier = internalAction({
  args: {
    tier: v.union(v.literal("30min"), v.literal("4hour"), v.literal("1week")),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    if (!isDevMode()) return PROD_DISABLED;

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    await ctx.runMutation(internal.debug.simulateInactivity, {
      userId: userId as any,
      tier: args.tier,
    });

    return {
      success: true,
      message: `Simulated ${args.tier} inactivity. Close and reopen the app to trigger a live greeting.`
    };
  },
});

/**
 * Debug: Insert a synthetic assistant message into a thread.
 * Useful for testing divider behavior with multiple messages.
 */
export const insertDebugMessage = internalAction({
  args: {
    threadId: v.string(),
    content: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    if (!isDevMode()) return PROD_DISABLED;

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const content = args.content ?? "Debug message";

    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId,
      message: {
        role: "assistant",
        content,
      },
    });

    return { success: true, message: "Debug message inserted." };
  },
});

/**
 * Debug: List messages for a thread showing raw format
 */
export const listRawMessagesForThread = internalQuery({
  args: {
    threadId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (!isDevMode()) return { count: 0, messages: [] };

    const result = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: { cursor: null, numItems: 50 },
    });

    return {
      count: result.page.length,
      messages: result.page.map((msg: any) => ({
        role: msg.message?.role,
        contentType: typeof msg.message?.content,
        contentPreview: typeof msg.message?.content === 'string'
          ? msg.message.content.slice(0, 100)
          : JSON.stringify(msg.message?.content)?.slice(0, 100),
        text: msg.text?.slice(0, 100),
        status: msg.status,
        tool: msg.tool,
        _creationTime: msg._creationTime,
      })),
    };
  },
});

/**
 * Debug: Check what greeting state exists for current user
 */
export const checkGreetingState = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    if (!isDevMode()) return { disabled: true };

    const userId = await getAuthUserId(ctx);
    if (!userId) return { error: "Not authenticated" };

    const user = await ctx.db.get(userId);
    if (!user) return { error: "User not found" };

    const now = Date.now();
    const lastActivity = user.lastActivityAt || 0;
    const gap = now - lastActivity;

    const cachedGreetings = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", q => q.eq("userId", user._id))
      .collect();

    return {
      userId: user._id,
      lastActivityAt: user.lastActivityAt ? new Date(user.lastActivityAt).toISOString() : null,
      gapMinutes: Math.round(gap / 60000),
      tier: gap >= 7 * 24 * 60 * 60 * 1000 ? "1week"
          : gap >= 4 * 60 * 60 * 1000 ? "4hour"
          : gap >= 30 * 60 * 1000 ? "30min"
          : "active",
      cachedGreetings: cachedGreetings.map(g => ({
        tier: g.tier,
        greeting: g.greeting,
        expiresAt: new Date(g.expiresAt).toISOString(),
        isValid: g.expiresAt > now,
      })),
    };
  },
});
