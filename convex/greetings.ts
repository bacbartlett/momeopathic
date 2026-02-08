import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ============================================
// TIME PREFIXES - Variety to avoid feeling canned
// ============================================

const TIME_PREFIXES = {
  lateNight: [
    // 10pm - 4am
    "Up late! ",
    "Burning the midnight oil? ",
    "Late night, huh? ",
    "Can't sleep? ",
    "",
  ],
  earlyMorning: [
    // 4am - 7am
    "Early start! ",
    "You're up early! ",
    "Good morning! ",
    "Early bird! ",
    "",
  ],
  morning: [
    // 7am - 12pm
    "Good morning! ",
    "Morning! ",
    "Hey! ",
    "Hi there! ",
    "",
  ],
  afternoon: [
    // 12pm - 5pm
    "Hey! ",
    "Good afternoon! ",
    "Hi there! ",
    "Hello! ",
    "",
  ],
  evening: [
    // 5pm - 10pm
    "Hey! ",
    "Good evening! ",
    "Evening! ",
    "Hi! ",
    "",
  ],
};

// Inactivity thresholds in milliseconds
const THRESHOLDS = {
  "30min": 30 * 60 * 1000,
  "4hour": 4 * 60 * 60 * 1000,
  "1week": 7 * 24 * 60 * 60 * 1000,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the time bucket for a given hour (0-23)
 */
function getTimeBucket(hour: number): keyof typeof TIME_PREFIXES {
  if (hour >= 22 || hour < 4) return "lateNight";
  if (hour >= 4 && hour < 7) return "earlyMorning";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/**
 * Get a random time-aware prefix
 */
function getTimePrefix(hour: number): string {
  const bucket = getTimeBucket(hour);
  const prefixes = TIME_PREFIXES[bucket];
  return prefixes[Math.floor(Math.random() * prefixes.length)];
}

/**
 * Get current hour in user's timezone (or UTC if not set)
 */
function getCurrentHour(timezone?: string): number {
  const now = new Date();
  if (timezone) {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
      });
      return parseInt(formatter.format(now), 10);
    } catch {
      // Invalid timezone, fall back to UTC
    }
  }
  return now.getUTCHours();
}

// ============================================
// ACTIVITY TRACKING
// ============================================

/**
 * Update user's last activity timestamp and schedule greeting generation.
 * Call this whenever a message is sent.
 */
export const recordActivity = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Update last activity
    await ctx.db.patch(args.userId, { lastActivityAt: now });

    // Cancel any pending greeting schedules
    const existingSchedules = await ctx.db
      .query("greetingSchedule")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const schedule of existingSchedules) {
      try {
        await ctx.scheduler.cancel(schedule.scheduledId);
      } catch {
        // Scheduled function may have already run
      }
      await ctx.db.delete(schedule._id);
    }

    // Clear any cached greetings (they're now stale)
    const existingCache = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const cached of existingCache) {
      await ctx.db.delete(cached._id);
    }

    // Schedule new greeting generation at each threshold
    const tiers = ["30min", "4hour", "1week"] as const;
    for (const tier of tiers) {
      const delay = THRESHOLDS[tier];
      const scheduledId = await ctx.scheduler.runAfter(
        delay,
        internal.greetings.generateGreeting,
        { userId: args.userId, tier }
      );

      await ctx.db.insert("greetingSchedule", {
        userId: args.userId,
        tier,
        scheduledId,
        scheduledFor: now + delay,
      });
    }

    return null;
  },
});

// ============================================
// GREETING GENERATION
// ============================================

/**
 * Generate a greeting for a user at a specific inactivity tier.
 * Called by scheduled job after inactivity threshold.
 */
export const generateGreeting = internalAction({
  args: {
    userId: v.id("users"),
    tier: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user info
    const user = await ctx.runQuery(internal.greetings.getUser, {
      userId: args.userId,
    });
    if (!user) return;

    // Get notes for context
    const notes = await ctx.runQuery(internal.notes.getNotes, {
      userId: args.userId,
    });

    // Generate greeting based on context
    const greeting = await generateGreetingText(notes, args.tier);

    // Cache the greeting
    await ctx.runMutation(internal.greetings.cacheGreeting, {
      userId: args.userId,
      tier: args.tier,
      greeting,
    });

    // Clean up the schedule entry
    await ctx.runMutation(internal.greetings.clearSchedule, {
      userId: args.userId,
      tier: args.tier,
    });
  },
});

/**
 * Generate greeting text based on notes and tier.
 * This is the core greeting logic.
 */
async function generateGreetingText(
  notes: { profile: string | null; activeCases: string | null; lessonsLearned: string[] | null },
  tier: string
): Promise<string> {
  // If there's an active case, follow up on it
  if (notes.activeCases && notes.activeCases.trim() !== "" && notes.activeCases !== "No active cases") {
    // Parse active cases to find the most recent/relevant
    // For now, just reference that there's an active case
    // The greeting should be specific based on the content

    // Simple parsing: look for names and issues
    const caseText = notes.activeCases;

    // Check for common patterns
    if (caseText.toLowerCase().includes("fever")) {
      return "How's that fever doing? Any change?";
    }
    if (caseText.toLowerCase().includes("teething")) {
      return "How's the teething going? Any better?";
    }
    if (caseText.toLowerCase().includes("earache") || caseText.toLowerCase().includes("ear")) {
      return "How's that ear doing? Still bothering them?";
    }
    if (caseText.toLowerCase().includes("cough")) {
      return "How's that cough? Any change?";
    }
    if (caseText.toLowerCase().includes("stomach") || caseText.toLowerCase().includes("tummy")) {
      return "How's their tummy? Feeling any better?";
    }
    if (caseText.toLowerCase().includes("headache")) {
      return "Did that headache clear up?";
    }

    // Generic active case follow-up
    return "How's everyone doing? Any updates since we last talked?";
  }

  // No active case - greeting based on tier
  if (tier === "1week") {
    // Long time, be friendly but not presumptuous
    if (notes.profile) {
      return "Hey! It's been a while. How's everyone doing?";
    }
    return "Hey! How are you doing?";
  }

  if (tier === "4hour") {
    // Medium gap
    if (notes.profile) {
      return "Hey! How's everyone doing?";
    }
    return "Hey! How can I help today?";
  }

  // 30min gap - short, casual
  return "Hey! What can I help with?";
}

// ============================================
// CACHE MANAGEMENT
// ============================================

export const cacheGreeting = internalMutation({
  args: {
    userId: v.id("users"),
    tier: v.string(),
    greeting: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Remove old cache for this tier
    const existing = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId_tier", (q) =>
        q.eq("userId", args.userId).eq("tier", args.tier)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Calculate expiry based on tier
    let expiresAt = now + 24 * 60 * 60 * 1000; // Default 24 hours
    if (args.tier === "30min") {
      expiresAt = now + 4 * 60 * 60 * 1000; // Expires when 4hour tier kicks in
    } else if (args.tier === "4hour") {
      expiresAt = now + 7 * 24 * 60 * 60 * 1000; // Expires when 1week tier kicks in
    }

    await ctx.db.insert("greetingCache", {
      userId: args.userId,
      greeting: args.greeting,
      tier: args.tier,
      generatedAt: now,
      expiresAt,
    });

    return null;
  },
});

export const clearSchedule = internalMutation({
  args: {
    userId: v.id("users"),
    tier: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const schedule = await ctx.db
      .query("greetingSchedule")
      .withIndex("by_userId_tier", (q) =>
        q.eq("userId", args.userId).eq("tier", args.tier)
      )
      .unique();

    if (schedule) {
      await ctx.db.delete(schedule._id);
    }

    return null;
  },
});

// ============================================
// GREETING RETRIEVAL (called on app open)
// ============================================

/**
 * Get the cached greeting for a user on app open.
 * Returns the greeting with time-aware prefix, or null if no greeting cached.
 */
export const getGreeting = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Check for cached greeting
    const cached = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    if (!cached) return null;

    // Check if expired
    if (cached.expiresAt < Date.now()) {
      return null;
    }

    // Add time-aware prefix
    const hour = getCurrentHour(user.timezone ?? undefined);
    const prefix = getTimePrefix(hour);

    return {
      greeting: prefix + cached.greeting,
      tier: cached.tier,
      generatedAt: cached.generatedAt,
    };
  },
});

/**
 * Get and consume the cached greeting (marks it as used).
 * Call this when pushing the greeting to the thread.
 */
export const consumeGreeting = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get and delete cached greeting
    const cached = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    if (!cached || cached.expiresAt < Date.now()) {
      return null;
    }

    // Delete the cached greeting
    await ctx.db.delete(cached._id);

    // Add time-aware prefix
    const hour = getCurrentHour(user.timezone ?? undefined);
    const prefix = getTimePrefix(hour);

    return {
      greeting: prefix + cached.greeting,
      tier: cached.tier,
    };
  },
});

// ============================================
// HELPER QUERIES
// ============================================

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Check if user should receive a greeting based on inactivity.
 * Returns the appropriate tier or null if too recent.
 * Internal version that accepts userId directly.
 */
export const checkInactivityTier = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user || !user.lastActivityAt) return null;

    const elapsed = Date.now() - user.lastActivityAt;

    if (elapsed >= THRESHOLDS["1week"]) return "1week";
    if (elapsed >= THRESHOLDS["4hour"]) return "4hour";
    if (elapsed >= THRESHOLDS["30min"]) return "30min";

    return null;
  },
});
