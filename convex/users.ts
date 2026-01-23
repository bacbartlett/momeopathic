import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Store the current user in the database.
 * This mutation should be called whenever a user signs in to ensure they exist in the database.
 * If the user already exists, it updates their profile information.
 * If they don't exist, it creates a new user record.
 */
export const store = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if user already exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      // User exists - update their profile if anything changed
      const updates: {
        name?: string;
        email?: string;
        imageUrl?: string;
      } = {};

      if (user.name !== identity.name) {
        updates.name = identity.name ?? "Anonymous";
      }
      if (user.email !== identity.email) {
        updates.email = identity.email;
      }
      if (user.imageUrl !== identity.pictureUrl) {
        updates.imageUrl = identity.pictureUrl;
      }

      // Only patch if there are changes
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
      }

      return user._id;
    }

    // User doesn't exist - create a new record
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? "Anonymous",
      email: identity.email,
      imageUrl: identity.pictureUrl,
    });
  },
});

/**
 * Get the current user from the database.
 * Returns null if the user is not authenticated or doesn't exist in the database.
 */
export const current = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      tokenIdentifier: v.string(),
      name: v.string(),
      email: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      disclaimerAccepted: v.optional(v.boolean()),
      feedbackGiven: v.optional(v.boolean()),
      feedbackThreadCount: v.optional(v.number()),
      feedbackDismissCount: v.optional(v.number()),
      noPaywall: v.optional(v.boolean()),
    }),
    v.null()
  ),
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

    return user;
  },
});

/**
 * Get a user by their database ID.
 */
export const getById = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      tokenIdentifier: v.string(),
      name: v.string(),
      email: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      disclaimerAccepted: v.optional(v.boolean()),
      feedbackGiven: v.optional(v.boolean()),
      feedbackThreadCount: v.optional(v.number()),
      feedbackDismissCount: v.optional(v.number()),
      noPaywall: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Update the disclaimer acceptance status for the current user.
 */
export const acceptDisclaimer = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called acceptDisclaimer without authentication present");
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found in database. Please sign in again.");
    }

    // Update the disclaimer acceptance status
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    return user?.disclaimerAccepted ?? false;
  },
});
