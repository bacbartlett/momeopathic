import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all essential notes for a user (profile, active cases, lessons).
 * Called at the start of every conversation.
 * Returns null fields if nothing exists yet.
 */
export const getNotes = internalQuery({
  args: { userId: v.string() },
  returns: v.object({
    profile: v.union(v.string(), v.null()),
    activeCases: v.union(v.string(), v.null()),
    lessonsLearned: v.union(v.array(v.string()), v.null()),
    recentCaseHistory: v.union(
      v.array(v.object({ entry: v.string(), createdAt: v.number() })),
      v.null(),
    ),
  }),
  handler: async (ctx, args) => {
    const [profile, activeCases, lessons, recentCases] = await Promise.all([
      ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .unique(),
      ctx.db
        .query("activeCases")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .unique(),
      ctx.db
        .query("lessonsLearned")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("caseHistory")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(5),
    ]);

    return {
      profile: profile?.content ?? null,
      activeCases: activeCases?.content ?? null,
      lessonsLearned: lessons.length > 0 ? lessons.map((l) => l.lesson) : null,
      recentCaseHistory:
        recentCases.length > 0
          ? recentCases.map((r) => ({ entry: r.entry, createdAt: r.createdAt }))
          : null,
    };
  },
});

/**
 * Get case history for a user.
 * Called when looking for patterns or making recommendations.
 * Optional limit to avoid pulling everything.
 */
export const getCaseHistory = internalQuery({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      entry: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("caseHistory")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc"); // Most recent first

    if (args.limit) {
      const results = await query.take(args.limit);
      return results.map((r) => ({ entry: r.entry, createdAt: r.createdAt }));
    }

    const results = await query.collect();
    return results.map((r) => ({ entry: r.entry, createdAt: r.createdAt }));
  },
});

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Save or update the user's profile.
 * Contains: names, ages, chronic conditions, preferences, experience level.
 * Overwrites existing profile.
 */
export const saveProfile = internalMutation({
  args: {
    userId: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: args.userId,
        content: args.content,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Save or update active cases.
 * Contains: current issues, last remedy, follow-up needed.
 * Overwrites existing active cases.
 */
export const saveActiveCases = internalMutation({
  args: {
    userId: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("activeCases")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("activeCases", {
        userId: args.userId,
        content: args.content,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Append a case to history.
 * Called when a case resolves or is worth logging.
 * Never overwrites - always appends.
 */
export const appendCaseHistory = internalMutation({
  args: {
    userId: v.string(),
    entry: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("caseHistory", {
      userId: args.userId,
      entry: args.entry,
      createdAt: Date.now(),
    });
    return null;
  },
});

/**
 * Save a lesson learned.
 * Called when a pattern is recognized.
 * Always appends - lessons accumulate over time.
 */
export const saveLesson = internalMutation({
  args: {
    userId: v.string(),
    lesson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("lessonsLearned", {
      userId: args.userId,
      lesson: args.lesson,
      createdAt: Date.now(),
    });
    return null;
  },
});

// Legacy notes table removed - migration complete
