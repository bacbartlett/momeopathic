import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Users table - extends authTables' default users table with app-specific fields.
  // Convex Auth creates user records here automatically on sign-in/account creation.
  // Use getAuthUserId(ctx) to get the current user's _id.
  users: defineTable({
    // Fields managed by Convex Auth (from authTables defaults)
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Legacy fields (kept optional for backwards compatibility with existing records)
    tokenIdentifier: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // App-specific fields
    disclaimerAccepted: v.optional(v.boolean()),
    feedbackThreadCount: v.optional(v.number()),
    feedbackDismissCount: v.optional(v.number()),
    feedbackGiven: v.optional(v.boolean()),
    lastActivityAt: v.optional(v.number()),
    timezone: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_lastActivity", ["lastActivityAt"]),

  // ============================================
  // NOTES SYSTEM - 4 types of persistent memory
  // ============================================

  // Profile - family info, preferences, rarely changes
  userProfiles: defineTable({
    userId: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Active Cases - current issues being worked on, updates frequently
  activeCases: defineTable({
    userId: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Case History - append-only log of past cases
  caseHistory: defineTable({
    userId: v.string(),
    entry: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Lessons Learned - patterns, what works for whom
  lessonsLearned: defineTable({
    userId: v.string(),
    lesson: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ============================================
  // GREETING CACHE SYSTEM
  // ============================================

  // Cached greetings generated after inactivity
  greetingCache: defineTable({
    userId: v.id("users"),
    // The pre-generated greeting body (without time prefix)
    greeting: v.string(),
    // Which inactivity tier triggered this: "30min" | "4hour" | "1week"
    tier: v.string(),
    // When this greeting was generated
    generatedAt: v.number(),
    // When this greeting expires (should regenerate)
    expiresAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_tier", ["userId", "tier"]),

  // Scheduled greeting jobs (to cancel if activity happens)
  greetingSchedule: defineTable({
    userId: v.id("users"),
    // Which tier this job is for
    tier: v.string(),
    // The scheduled function ID (to cancel if needed)
    scheduledId: v.id("_scheduled_functions"),
    // When this job is scheduled to run
    scheduledFor: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_tier", ["userId", "tier"]),

  // ============================================
  // RATE LIMITING
  // ============================================

  // Simple rate limit tracking - stores timestamp of recent messages
  rateLimitMessages: defineTable({
    userId: v.id("users"),
    timestamp: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_timestamp", ["userId", "timestamp"]),
});
