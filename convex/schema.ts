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

  // Notes table - stores per-user notes from the AI agent across conversations
  // Used by the homeopathic agent to remember family details, active cases, etc.
  notes: defineTable({
    // The user this note belongs to (users._id as string, matching agent userId)
    userId: v.string(),
    // The note content (free-form text from the agent)
    content: v.string(),
    // Last updated timestamp
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

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
