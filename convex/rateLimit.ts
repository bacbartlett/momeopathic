/**
 * Simple rate limiting for message sending.
 * Prevents spam without affecting legitimate users.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Rate limit: 20 messages per minute (very generous for real users)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = 20;

// Cleanup: delete entries older than 5 minutes
const CLEANUP_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Check if user is within rate limit.
 * Returns true if allowed, false if rate limited.
 */
export const checkRateLimit = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Count messages in the current window
    const recentMessages = await ctx.db
      .query("rateLimitMessages")
      .withIndex("by_userId_timestamp", (q) =>
        q.eq("userId", args.userId).gte("timestamp", windowStart)
      )
      .collect();

    const count = recentMessages.length;
    const allowed = count < RATE_LIMIT_MAX_MESSAGES;
    const remaining = Math.max(0, RATE_LIMIT_MAX_MESSAGES - count);

    return { allowed, remaining };
  },
});

/**
 * Record a message for rate limiting.
 * Also cleans up old entries.
 */
export const recordMessage = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Record this message
    await ctx.db.insert("rateLimitMessages", {
      userId: args.userId,
      timestamp: now,
    });

    // Cleanup old entries (older than 5 minutes)
    const cleanupThreshold = now - CLEANUP_THRESHOLD_MS;
    const oldEntries = await ctx.db
      .query("rateLimitMessages")
      .withIndex("by_userId_timestamp", (q) =>
        q.eq("userId", args.userId).lt("timestamp", cleanupThreshold)
      )
      .collect();

    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }

    return null;
  },
});
