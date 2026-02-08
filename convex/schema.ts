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
    // Number of threads interacted with since last prompt (or since start)
    feedbackThreadCount: v.optional(v.number()),
    // Number of times the user has dismissed the feedback prompt
    feedbackDismissCount: v.optional(v.number()),
    // Whether the user has given feedback (happy or submitted negative feedback)
    feedbackGiven: v.optional(v.boolean()),
    // Guest user support
    isGuest: v.optional(v.boolean()),
    guestId: v.optional(v.string()),
    guestThreadCount: v.optional(v.number()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_guestId", ["guestId"]),

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
    // When the case was logged (not when it happened)
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Lessons Learned - patterns, what works for whom
  lessonsLearned: defineTable({
    userId: v.string(),
    lesson: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ============================================
  // LEGACY - keeping for migration, will deprecate
  // ============================================

  // Notes table - OLD single-note system (deprecated, migrate to new system)
  notes: defineTable({
    userId: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ============================================
  // OTHER TABLES
  // ============================================

  // Offer codes table - stores promotional codes that grant free access
  offerCodes: defineTable({
    // The actual code string (case-insensitive)
    code: v.string(),
    // Optional description of what this code is for
    description: v.optional(v.string()),
    // Maximum number of times this code can be used (null = unlimited)
    maxUses: v.optional(v.number()),
    // Number of times this code has been used
    usedCount: v.number(),
    // Whether this code is currently active
    isActive: v.boolean(),
    // Optional expiration date (timestamp in milliseconds)
    expiresAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  // Offer code redemptions - tracks which users have redeemed which codes
  offerCodeRedemptions: defineTable({
    // Reference to the offer code
    codeId: v.id("offerCodes"),
    // Reference to the user who redeemed it
    userId: v.id("users"),
    // The actual code string (for reference)
    codeString: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_code", ["codeId"])
    .index("by_user_and_code", ["userId", "codeId"]),
});
