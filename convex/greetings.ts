import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { homeopathicAgent } from "./agents/homeopathic";

// ============================================
// TIME BUCKETS & PREFIXES
// ============================================

// Time buckets for greeting prefixes (user's local time)
const TIME_BUCKETS = {
  lateNight: { start: 22, end: 4 }, // 10pm-4am
  earlyMorning: { start: 4, end: 7 }, // 4am-7am
  morning: { start: 7, end: 12 }, // 7am-12pm
  afternoon: { start: 12, end: 17 }, // 12pm-5pm
  evening: { start: 17, end: 22 }, // 5pm-10pm
} as const;

// Prefix variations per time bucket (variety so they don't feel canned)
const TIME_PREFIXES: Record<string, string[]> = {
  lateNight: [
    "Burning the midnight oil?",
    "Late night check-in —",
    "Quiet hours, I know —",
    "Can't sleep?",
    "Night owl mode activated —",
  ],
  earlyMorning: [
    "Early bird!",
    "Up before the sun —",
    "Early start today?",
    "Dawn patrol —",
  ],
  morning: [
    "Good morning!",
    "Morning!",
    "Hope your morning's off to a good start —",
  ],
  afternoon: [
    "Good afternoon!",
    "Afternoon check-in —",
    "Hope your day's going well —",
  ],
  evening: [
    "Good evening!",
    "Evening!",
    "Winding down?",
    "Hope your evening is going smoothly —",
  ],
};

// Inactivity tiers (in milliseconds)
const INACTIVITY_TIERS = {
  "30min": 30 * 60 * 1000,
  "4hour": 4 * 60 * 60 * 1000,
  "1week": 7 * 24 * 60 * 60 * 1000,
} as const;

// How long each cached greeting is valid before regeneration
const CACHE_TTL = {
  "30min": 4 * 60 * 60 * 1000, // 4 hours
  "4hour": 24 * 60 * 60 * 1000, // 1 day
  "1week": 7 * 24 * 60 * 60 * 1000, // 1 week
} as const;

// ============================================
// HELPERS
// ============================================

/**
 * Get the time bucket for a given hour (0-23) in user's local time
 */
function getTimeBucket(hour: number): keyof typeof TIME_BUCKETS {
  // lateNight wraps around midnight
  if (hour >= 22 || hour < 4) return "lateNight";
  if (hour >= 4 && hour < 7) return "earlyMorning";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/**
 * Get a random prefix for a time bucket
 */
function getRandomPrefix(bucket: keyof typeof TIME_BUCKETS): string {
  const prefixes = TIME_PREFIXES[bucket];
  return prefixes[Math.floor(Math.random() * prefixes.length)];
}

/**
 * Get the user's local hour from their timezone
 */
function getUserLocalHour(timezone?: string): number {
  try {
    const tz = timezone || "America/New_York"; // Default to Eastern
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    return hourPart ? parseInt(hourPart.value, 10) : 12;
  } catch {
    return 12; // Default to noon if timezone parsing fails
  }
}

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get user's notes context for greeting generation
 */
export const getUserContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    // Get active cases
    const activeCases = await ctx.db
      .query("activeCases")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    // Get recent case history (last 5 entries)
    const caseHistory = await ctx.db
      .query("caseHistory")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);

    // Get lessons learned (last 5)
    const lessons = await ctx.db
      .query("lessonsLearned")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);

    return {
      profile: profile?.content,
      activeCases: activeCases?.content,
      recentHistory: caseHistory.map((h) => h.entry),
      lessons: lessons.map((l) => l.lesson),
    };
  },
});

/**
 * Get user by ID (for actions)
 */
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Get cached greeting for a user
 */
export const getCachedGreeting = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all cached greetings for user, ordered by tier priority
    const cached = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter valid (non-expired) greetings
    const valid = cached.filter((g) => g.expiresAt > now);

    if (valid.length === 0) return null;

    // Return the most appropriate one (longest tier = most personalized)
    // Priority: 1week > 4hour > 30min
    const tierOrder = ["1week", "4hour", "30min"];
    for (const tier of tierOrder) {
      const match = valid.find((g) => g.tier === tier);
      if (match) return match;
    }

    return valid[0];
  },
});

/**
 * Get pending scheduled greetings for a user
 */
export const getPendingSchedules = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("greetingSchedule")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Check which inactivity tier the user is in
 * Returns null if recently active (<30min), otherwise "30min", "4hour", or "1week"
 */
export const checkInactivityTier = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<string | null> => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const now = Date.now();
    const lastActivity = user.lastActivityAt || 0;
    const gap = now - lastActivity;

    if (gap >= INACTIVITY_TIERS["1week"]) return "1week";
    if (gap >= INACTIVITY_TIERS["4hour"]) return "4hour";
    if (gap >= INACTIVITY_TIERS["30min"]) return "30min";
    return null;
  },
});

/**
 * Get a cached greeting without consuming it
 */
export const getGreeting = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const now = Date.now();

    // Get all cached greetings for user
    const cached = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter valid (non-expired) greetings
    const valid = cached.filter((g) => g.expiresAt > now);

    if (valid.length === 0) return null;

    // Return the most appropriate one (longest tier = most personalized)
    const tierOrder = ["1week", "4hour", "30min"];
    for (const tier of tierOrder) {
      const match = valid.find((g) => g.tier === tier);
      if (match) {
        // Add time prefix
        const hour = getUserLocalHour(user.timezone);
        const bucket = getTimeBucket(hour);
        const prefix = getRandomPrefix(bucket);
        return {
          greeting: `${prefix} ${match.greeting}`,
          tier: match.tier,
        };
      }
    }

    return null;
  },
});

/**
 * Consume a cached greeting (get and delete it)
 */
export const consumeGreeting = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const now = Date.now();

    // Get all cached greetings for user
    const cached = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter valid (non-expired) greetings
    const valid = cached.filter((g) => g.expiresAt > now);

    if (valid.length === 0) return null;

    // Find the best one (longest tier = most personalized)
    const tierOrder = ["1week", "4hour", "30min"];
    let bestMatch = null;
    for (const tier of tierOrder) {
      const match = valid.find((g) => g.tier === tier);
      if (match) {
        bestMatch = match;
        break;
      }
    }

    if (!bestMatch) return null;

    // Delete it (consume)
    await ctx.db.delete(bestMatch._id);

    // Add time prefix
    const hour = getUserLocalHour(user.timezone);
    const bucket = getTimeBucket(hour);
    const prefix = getRandomPrefix(bucket);

    return {
      greeting: `${prefix} ${bestMatch.greeting}`,
      tier: bestMatch.tier,
    };
  },
});

/**
 * Get greeting info for thread opening (called from threads.getOrCreate)
 * Returns greeting with time prefix and divider flag
 */
export const getGreetingForThread = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const now = Date.now();
    const lastActivity = user.lastActivityAt || 0;

    // If user was recently active (within 30min), no greeting needed
    if (now - lastActivity < INACTIVITY_TIERS["30min"]) {
      return null;
    }

    // Get cached greeting
    const cached = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter valid (non-expired) greetings
    const validCached = cached.filter((g) => g.expiresAt > now);

    // Get the best tier (longest inactivity = most personalized)
    const tierOrder = ["1week", "4hour", "30min"];
    let bestCached = null;
    for (const tier of tierOrder) {
      const match = validCached.find((g) => g.tier === tier);
      if (match) {
        bestCached = match;
        break;
      }
    }

    // Build greeting with time prefix
    const hour = getUserLocalHour(user.timezone);
    const bucket = getTimeBucket(hour);
    const prefix = getRandomPrefix(bucket);

    console.log("[getGreetingForThread] userId:", args.userId);
    console.log(
      "[getGreetingForThread] gap (min):",
      Math.round((now - lastActivity) / 60000),
    );
    console.log(
      "[getGreetingForThread] validCached count:",
      validCached.length,
    );
    console.log(
      "[getGreetingForThread] bestCached:",
      bestCached ? bestCached.tier : "none",
    );

    if (bestCached) {
      const result = {
        greeting: `${prefix} ${bestCached.greeting}`,
        tier: bestCached.tier,
        showDivider: now - lastActivity >= INACTIVITY_TIERS["4hour"],
      };
      console.log("[getGreetingForThread] returning:", JSON.stringify(result));
      return result;
    }

    // Fallback greeting
    const fallbackResult = {
      greeting: `${prefix} How can I help you today?`,
      tier: "fallback",
      showDivider: now - lastActivity >= INACTIVITY_TIERS["4hour"],
    };
    console.log(
      "[getGreetingForThread] returning fallback:",
      JSON.stringify(fallbackResult),
    );
    return fallbackResult;
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Save a generated greeting to cache
 */
export const saveGreetingToCache = internalMutation({
  args: {
    userId: v.id("users"),
    greeting: v.string(),
    tier: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ttl =
      CACHE_TTL[args.tier as keyof typeof CACHE_TTL] || CACHE_TTL["30min"];

    // Delete any existing greeting for this tier
    const existing = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId_tier", (q) =>
        q.eq("userId", args.userId).eq("tier", args.tier),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Save new greeting
    await ctx.db.insert("greetingCache", {
      userId: args.userId,
      greeting: args.greeting,
      tier: args.tier,
      generatedAt: now,
      expiresAt: now + ttl,
    });
  },
});

/**
 * Schedule a greeting generation job
 */
export const scheduleGreetingJob = internalMutation({
  args: {
    userId: v.id("users"),
    tier: v.string(),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete any existing schedule for this tier
    const existing = await ctx.db
      .query("greetingSchedule")
      .withIndex("by_userId_tier", (q) =>
        q.eq("userId", args.userId).eq("tier", args.tier),
      )
      .unique();

    if (existing) {
      // Cancel the scheduled function
      try {
        await ctx.scheduler.cancel(existing.scheduledId);
      } catch {
        // Ignore if already executed
      }
      await ctx.db.delete(existing._id);
    }

    // Schedule the greeting generation
    const scheduledId = await ctx.scheduler.runAt(
      args.scheduledFor,
      internal.greetings.generateGreeting,
      { userId: args.userId, tier: args.tier },
    );

    // Save the schedule reference
    await ctx.db.insert("greetingSchedule", {
      userId: args.userId,
      tier: args.tier,
      scheduledId,
      scheduledFor: args.scheduledFor,
    });
  },
});

/**
 * Cancel all pending greeting schedules for a user
 */
export const cancelPendingGreetings = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("greetingSchedule")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const schedule of pending) {
      try {
        await ctx.scheduler.cancel(schedule.scheduledId);
      } catch {
        // Ignore if already executed
      }
      await ctx.db.delete(schedule._id);
    }
  },
});

/**
 * Clear greeting cache for a user (when they return)
 */
export const clearGreetingCache = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const greeting of cached) {
      await ctx.db.delete(greeting._id);
    }
  },
});

/**
 * Update user's last activity timestamp
 */
export const updateLastActivity = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      lastActivityAt: Date.now(),
    });
  },
});

/**
 * Record user activity - called from messages.send action
 * Updates lastActivityAt, cancels pending schedules, clears cache, schedules new greetings
 */
export const recordActivity = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Update last activity
    await ctx.db.patch(args.userId, { lastActivityAt: now });

    // Cancel any pending greeting schedules
    const pending = await ctx.db
      .query("greetingSchedule")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const schedule of pending) {
      try {
        await ctx.scheduler.cancel(schedule.scheduledId);
      } catch {
        // Ignore if already executed
      }
      await ctx.db.delete(schedule._id);
    }

    // Clear any cached greetings (they're stale now)
    const cached = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const greeting of cached) {
      await ctx.db.delete(greeting._id);
    }

    // Schedule new greeting generations
    for (const [tier, delay] of Object.entries(INACTIVITY_TIERS)) {
      const scheduledFor = now + delay;

      const scheduledId = await ctx.scheduler.runAt(
        scheduledFor,
        internal.greetings.generateGreeting,
        { userId: args.userId, tier },
      );

      await ctx.db.insert("greetingSchedule", {
        userId: args.userId,
        tier,
        scheduledId,
        scheduledFor,
      });
    }
  },
});

// ============================================
// INTERNAL ACTIONS
// ============================================

/**
 * Generate a greeting using the AI agent
 */
export const generateGreeting = internalAction({
  args: {
    userId: v.id("users"),
    tier: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user and their context
    const user = await ctx.runQuery(internal.greetings.getUserById, {
      userId: args.userId,
    });
    if (!user) return;

    const context = await ctx.runQuery(internal.greetings.getUserContext, {
      userId: args.userId,
    });

    // Build the generation prompt
    let prompt = `Generate a warm, personalized greeting for a returning user. `;
    prompt += `They've been away for ${args.tier === "1week" ? "about a week" : args.tier === "4hour" ? "a few hours" : "a little while"}. `;

    if (context.activeCases) {
      prompt += `\n\nTheir active cases: ${context.activeCases}`;
    }
    if (context.recentHistory.length > 0) {
      prompt += `\n\nRecent case history: ${context.recentHistory.slice(0, 2).join("; ")}`;
    }
    if (context.profile) {
      prompt += `\n\nFamily profile: ${context.profile}`;
    }

    prompt += `\n\nGenerate ONLY the greeting body (1-2 sentences). Do NOT include a time-based prefix like "Good morning" - that will be added separately. `;
    prompt += `Be warm and reference relevant context if available. If they had active cases, ask a natural follow-up about how things are going.`;
    prompt += `While being warm, remember that someone is probably coming to this app to seek help, so do not use any exclamation marks or anything that would feel overly excited about them coming back.`;
    prompt += `It should feel like a warm receptionist at a doctors office who deeply cares and knows you well.`;
    prompt += `Jump right to the main content. Do not say "Good to see you" or "Good to hear from you"`;

    try {
      // Use a lightweight approach - create temp thread, generate, cleanup
      const { threadId } = await homeopathicAgent.createThread(ctx, {
        userId: args.userId,
      });

      const result = await homeopathicAgent.generateText(
        ctx,
        { threadId, userId: args.userId },
        { prompt },
      );

      const greeting = result.text.trim();

      // Save to cache
      await ctx.runMutation(internal.greetings.saveGreetingToCache, {
        userId: args.userId,
        greeting,
        tier: args.tier,
      });

      // Clean up the temporary thread
      await homeopathicAgent.deleteThreadSync(ctx, { threadId });
    } catch (error) {
      console.error(
        `Failed to generate greeting for user ${args.userId}:`,
        error,
      );
    }
  },
});

// ============================================
// PUBLIC API
// ============================================

// Return type for getGreetingOnOpen
interface GreetingOnOpenResult {
  greeting: string;
  tier: string;
  showDivider: boolean;
}

/**
 * Called on app open - returns cached greeting with time prefix
 * Returns null if no greeting is needed (user was recently active)
 */
export const getGreetingOnOpen = query({
  args: {
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GreetingOnOpenResult | null> => {
    // Resolve user
    const identity = await ctx.auth.getUserIdentity();
    let user = null;

    if (identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier),
        )
        .unique();
    } else if (args.guestId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_guestId", (q) => q.eq("guestId", args.guestId))
        .unique();
    }

    if (!user) return null;

    // Check if user was recently active (within 30min)
    const now = Date.now();
    const lastActivity = user.lastActivityAt || 0;
    if (now - lastActivity < INACTIVITY_TIERS["30min"]) {
      return null; // No greeting needed
    }

    // Get cached greeting (explicit cast to avoid circular type inference)
    const cached = (await ctx.runQuery(internal.greetings.getCachedGreeting, {
      userId: user._id,
    })) as {
      greeting: string;
      tier: string;
      generatedAt: number;
      expiresAt: number;
    } | null;

    if (!cached) {
      // No cached greeting - return a simple fallback
      const hour = getUserLocalHour(user.timezone);
      const bucket = getTimeBucket(hour);
      const prefix = getRandomPrefix(bucket);
      return {
        greeting: `${prefix} How can I help you today?`,
        tier: "fallback",
        showDivider: now - lastActivity >= INACTIVITY_TIERS["4hour"],
      };
    }

    // Build the full greeting with time prefix
    const hour = getUserLocalHour(user.timezone);
    const bucket = getTimeBucket(hour);
    const prefix = getRandomPrefix(bucket);

    return {
      greeting: `${prefix} ${cached.greeting}`,
      tier: cached.tier,
      showDivider: now - lastActivity >= INACTIVITY_TIERS["4hour"],
    };
  },
});

/**
 * Called when user sends a message - reschedule greeting generation
 */
export const onUserActivity = mutation({
  args: {
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Resolve user
    const identity = await ctx.auth.getUserIdentity();
    let user = null;

    if (identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier),
        )
        .unique();
    } else if (args.guestId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_guestId", (q) => q.eq("guestId", args.guestId))
        .unique();
    }

    if (!user) return;

    const now = Date.now();

    // Update last activity
    await ctx.db.patch(user._id, { lastActivityAt: now });

    // Cancel any pending greeting schedules
    const pending = await ctx.db
      .query("greetingSchedule")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const schedule of pending) {
      try {
        await ctx.scheduler.cancel(schedule.scheduledId);
      } catch {
        // Ignore if already executed
      }
      await ctx.db.delete(schedule._id);
    }

    // Clear any cached greetings (they're stale now)
    const cached = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const greeting of cached) {
      await ctx.db.delete(greeting._id);
    }

    // Schedule new greeting generations
    for (const [tier, delay] of Object.entries(INACTIVITY_TIERS)) {
      const scheduledFor = now + delay;

      const scheduledId = await ctx.scheduler.runAt(
        scheduledFor,
        internal.greetings.generateGreeting,
        { userId: user._id, tier },
      );

      await ctx.db.insert("greetingSchedule", {
        userId: user._id,
        tier,
        scheduledId,
        scheduledFor,
      });
    }
  },
});
