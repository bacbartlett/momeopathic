/**
 * DEBUG ENDPOINTS - Remove before production build
 * 
 * These are for testing the greeting system and debugging message issues.
 */

import { listMessages, saveMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";

// Note: TypeScript errors about internal.debug will resolve after running `npx convex dev`

/**
 * Debug: Get raw messages for a thread (bypasses toUIMessages transform)
 * This helps us see exactly what's stored in the agent's message table
 */
export const getRawMessages = query({
  args: { threadId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
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
    const now = Date.now();
    const offsets = {
      "30min": 35 * 60 * 1000,        // 35 minutes ago
      "4hour": 5 * 60 * 60 * 1000,    // 5 hours ago
      "1week": 8 * 24 * 60 * 60 * 1000, // 8 days ago
    };
    
    const newLastActivity = now - offsets[args.tier];
    
    await ctx.db.patch(args.userId, {
      lastActivityAt: newLastActivity,
    });
    
    console.log(`[DEBUG] Set lastActivityAt to ${new Date(newLastActivity).toISOString()} (${args.tier} tier)`);
    return null;
  },
});

/**
 * Debug: Public action to trigger inactivity simulation
 * Call this from the UI to test greeting tiers
 */
export const testGreetingTier = action({
  args: {
    tier: v.union(v.literal("30min"), v.literal("4hour"), v.literal("1week")),
    guestId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Resolve user
    const identity = await ctx.auth.getUserIdentity();
    let user = null;

    if (identity) {
      user = await ctx.runQuery(internal.threads.getUserByToken, {
        tokenIdentifier: identity.tokenIdentifier,
      });
    } else if (args.guestId) {
      user = await ctx.runQuery(internal.threads.getGuestUserByGuestId, {
        guestId: args.guestId,
      });
    }

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Simulate inactivity
    await ctx.runMutation(internal.debug.simulateInactivity, {
      userId: user._id,
      tier: args.tier,
    });

    // Trigger greeting generation for this tier
    await ctx.scheduler.runAfter(0, internal.greetings.generateGreeting, {
      userId: user._id,
      tier: args.tier,
    });

    return { 
      success: true, 
      message: `Simulated ${args.tier} inactivity. Close and reopen the app to see the greeting.`
    };
  },
});

/**
 * Debug: Insert a synthetic assistant message into a thread.
 * Useful for testing divider behavior with multiple messages.
 */
export const insertDebugMessage = action({
  args: {
    threadId: v.string(),
    guestId: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let user = null;

    if (identity) {
      user = await ctx.runQuery(internal.threads.getUserByToken, {
        tokenIdentifier: identity.tokenIdentifier,
      });
    } else if (args.guestId) {
      user = await ctx.runQuery(internal.threads.getGuestUserByGuestId, {
        guestId: args.guestId,
      });
    }

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const content = args.content ?? "Debug message";

    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: user._id,
      message: {
        role: "assistant",
        content,
      },
    });

    return { success: true, message: "Debug message inserted." };
  },
});

/**
 * Debug: Check what greeting would be returned right now
 */
/**
 * Debug: List messages for a thread showing raw format
 * Call from dashboard or add to UI to see what's actually stored
 */
export const listRawMessagesForThread = query({
  args: { 
    threadId: v.string(),
    guestId: v.optional(v.string()) 
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const result = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: { cursor: null, numItems: 50 },
    });
    
    // Return simplified view of messages
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

export const checkGreetingState = query({
  args: { guestId: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let user = null;

    if (identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
    } else if (args.guestId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_guestId", q => q.eq("guestId", args.guestId))
        .unique();
    }

    if (!user) return { error: "User not found" };

    const now = Date.now();
    const lastActivity = user.lastActivityAt || 0;
    const gap = now - lastActivity;

    // Get cached greetings
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
