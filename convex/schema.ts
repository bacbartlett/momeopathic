import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores authenticated users from Clerk
  users: defineTable({
    // The tokenIdentifier from Clerk (ctx.auth.getUserIdentity().tokenIdentifier)
    // Format: "https://<issuer>|<subject>" - guaranteed unique per user
    tokenIdentifier: v.string(),
    // User's display name from Clerk
    name: v.string(),
    // User's email from Clerk (optional, may not always be available)
    email: v.optional(v.string()),
    // User's profile image URL from Clerk
    imageUrl: v.optional(v.string()),
    // Whether the user has accepted the disclaimer
    disclaimerAccepted: v.optional(v.boolean()),
    // If true, allows user to engage with the app without a subscription
    noPaywall: v.optional(v.boolean()),
    // Feedback prompt tracking
    feedbackThreadCount: v.optional(v.number()),
    feedbackDismissCount: v.optional(v.number()),
    feedbackGiven: v.optional(v.boolean()),
    // Guest user support
    isGuest: v.optional(v.boolean()),
    guestId: v.optional(v.string()),
    guestThreadCount: v.optional(v.number()),
    // Activity tracking for greeting system
    lastActivityAt: v.optional(v.number()),
    // User's timezone (for time-aware greetings) - e.g., "America/New_York"
    timezone: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_guestId", ["guestId"])
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
  // LEGACY - keeping for migration, will deprecate
  // ============================================

  notes: defineTable({
    userId: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ============================================
  // OTHER TABLES
  // ============================================

  offerCodes: defineTable({
    code: v.string(),
    description: v.optional(v.string()),
    maxUses: v.optional(v.number()),
    usedCount: v.number(),
    isActive: v.boolean(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  offerCodeRedemptions: defineTable({
    codeId: v.id("offerCodes"),
    userId: v.id("users"),
    codeString: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_code", ["codeId"])
    .index("by_user_and_code", ["userId", "codeId"]),
});
