import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Feedback prompt thresholds
const INITIAL_THRESHOLD = 5; // First prompt after 5 threads
const BACKOFF_INCREMENT = 5; // Each dismissal adds 5 more to the increment

/**
 * Calculate the threshold for showing the feedback prompt.
 * Pattern: 5, then 5+10=15, then 15+15=30, then 30+20=50, etc.
 */
function calculateThreshold(dismissCount: number): number {
  if (dismissCount === 0) {
    return INITIAL_THRESHOLD;
  }
  // Sum of arithmetic series: initial + sum of increments
  let threshold = INITIAL_THRESHOLD;
  for (let i = 1; i <= dismissCount; i++) {
    threshold += BACKOFF_INCREMENT + (BACKOFF_INCREMENT * i);
  }
  return threshold;
}

/**
 * Get the feedback status for the current user.
 * Returns whether the user should see the feedback prompt.
 */
export const getFeedbackStatus = query({
  args: {},
  returns: v.object({
    shouldShowPrompt: v.boolean(),
    threadCount: v.number(),
    threshold: v.number(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { shouldShowPrompt: false, threadCount: 0, threshold: INITIAL_THRESHOLD };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return { shouldShowPrompt: false, threadCount: 0, threshold: INITIAL_THRESHOLD };
    }

    // If user has already given feedback, never show again
    if (user.feedbackGiven) {
      return { shouldShowPrompt: false, threadCount: 0, threshold: 0 };
    }

    const threadCount = user.feedbackThreadCount ?? 0;
    const dismissCount = user.feedbackDismissCount ?? 0;
    const threshold = calculateThreshold(dismissCount);

    return {
      shouldShowPrompt: threadCount >= threshold,
      threadCount,
      threshold,
    };
  },
});

/**
 * Increment the thread count for feedback tracking.
 * Called when a user interacts with a thread (sends a message).
 */
export const incrementThreadCount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return null;
    }

    // Don't track if user has already given feedback
    if (user.feedbackGiven) {
      return null;
    }

    const currentCount = user.feedbackThreadCount ?? 0;
    await ctx.db.patch(user._id, {
      feedbackThreadCount: currentCount + 1,
    });

    return null;
  },
});

/**
 * Record that the user dismissed the feedback prompt.
 * Increases the backoff threshold for future prompts.
 */
export const recordFeedbackPromptDismissed = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const currentDismissCount = user.feedbackDismissCount ?? 0;
    
    // Reset thread count and increment dismiss count
    await ctx.db.patch(user._id, {
      feedbackThreadCount: 0,
      feedbackDismissCount: currentDismissCount + 1,
    });

    return null;
  },
});

/**
 * Record that the user gave feedback (either positive or negative).
 * This prevents the prompt from showing again.
 */
export const recordFeedbackGiven = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      feedbackGiven: true,
    });

    return null;
  },
});

/**
 * Internal mutation to get user info for feedback submission and mark feedback as given.
 * Returns user info for the email.
 */
export const getUserForFeedback = internalMutation({
  args: { tokenIdentifier: v.string() },
  returns: v.union(
    v.object({
      id: v.string(),
      name: v.string(),
      email: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args): Promise<{ id: string; name: string; email?: string } | null> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return null;
    }

    // Mark feedback as given
    await ctx.db.patch(user._id, {
      feedbackGiven: true,
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
    };
  },
});
