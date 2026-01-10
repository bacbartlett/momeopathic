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
  })
    .index("by_token", ["tokenIdentifier"]),
});
