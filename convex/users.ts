import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Shared return validator for user objects
const userReturnValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  image: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  // Legacy fields (from old Clerk-based auth pattern, kept for existing records)
  tokenIdentifier: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  // App-specific fields
  disclaimerAccepted: v.optional(v.boolean()),
  feedbackGiven: v.optional(v.boolean()),
  feedbackThreadCount: v.optional(v.number()),
  feedbackDismissCount: v.optional(v.number()),
  lastActivityAt: v.optional(v.number()),
  timezone: v.optional(v.string()),
});

/**
 * Store/sync the current user in the database.
 * Convex Auth already creates the user record — this just ensures
 * we can reference the user and update profile fields if needed.
 */
export const store = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Called storeUser without authentication present");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User record not found — this should not happen with Convex Auth");
    }

    return user._id;
  },
});

/**
 * Get the current user from the database.
 * Returns null if the user is not authenticated or doesn't exist in the database.
 */
export const current = query({
  args: {},
  returns: v.union(userReturnValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

/**
 * Get a user by their database ID.
 * Restricted to the authenticated user's own record.
 */
export const getById = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(userReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    // Only allow fetching your own record
    if (args.userId !== userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

/**
 * Update the disclaimer acceptance status for the current user.
 */
export const acceptDisclaimer = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Called acceptDisclaimer without authentication present");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found in database. Please sign in again.");
    }

    await ctx.db.patch(user._id, {
      disclaimerAccepted: true,
    });

    return user._id;
  },
});

/**
 * Check if the current user has accepted the disclaimer.
 */
export const hasAcceptedDisclaimer = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const user = await ctx.db.get(userId);
    return user?.disclaimerAccepted ?? false;
  },
});

/**
 * Update user profile (name).
 */
export const updateProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Called updateProfile without authentication present");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found in database.");
    }

    const name = [args.firstName.trim(), args.lastName.trim()].filter(Boolean).join(" ") || "Anonymous";
    await ctx.db.patch(user._id, { name });
    return null;
  },
});

/**
 * Delete the current user's account and all their data.
 */
export const deleteAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Called deleteAccount without authentication present");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    await ctx.db.delete(user._id);
    return null;
  },
});
