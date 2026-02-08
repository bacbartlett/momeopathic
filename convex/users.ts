import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { v } from "convex/values";

// Shared return validator for user objects
const userReturnValidator = v.object({
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
  isGuest: v.optional(v.boolean()),
  guestId: v.optional(v.string()),
  guestThreadCount: v.optional(v.number()),
});

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
  returns: v.union(userReturnValidator, v.null()),
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
  returns: v.union(userReturnValidator, v.null()),
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

// ============================================================
// Guest User Support
// ============================================================

/**
 * Create a guest user record. No auth required.
 * Idempotent: returns existing user if guestId already exists.
 */
export const createGuestUser = mutation({
  args: { guestId: v.string() },
  returns: v.object({ userId: v.id("users") }),
  handler: async (ctx, args) => {
    // Validate guestId format
    if (args.guestId.length < 20 || args.guestId.length > 50) {
      throw new Error("Invalid guestId format");
    }

    // Idempotent: check if guest already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_guestId", (q) => q.eq("guestId", args.guestId))
      .unique();

    if (existing) {
      return { userId: existing._id };
    }

    // Create new guest user
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: `guest:${args.guestId}`,
      name: "Guest",
      isGuest: true,
      guestId: args.guestId,
      guestThreadCount: 0,
    });

    return { userId };
  },
});

/**
 * Get a guest user by guestId. No auth required.
 */
export const getGuestUser = query({
  args: { guestId: v.string() },
  returns: v.union(userReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_guestId", (q) => q.eq("guestId", args.guestId))
      .unique();
  },
});

// Internal helpers for claimGuestAccount

export const getUserByTokenInternal = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.union(userReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();
  },
});

export const getGuestUserInternal = internalQuery({
  args: { guestId: v.string() },
  returns: v.union(userReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_guestId", (q) => q.eq("guestId", args.guestId))
      .unique();
  },
});

/**
 * Upgrade a guest user record to a real authenticated user in-place.
 */
export const upgradeGuestUser = internalMutation({
  args: {
    userId: v.id("users"),
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      tokenIdentifier: args.tokenIdentifier,
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      isGuest: undefined,
      guestId: undefined,
      guestThreadCount: undefined,
    });
    return null;
  },
});

/**
 * Internal mutation to store a user (same logic as public `store` but callable from actions).
 */
export const storeInternal = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      tokenIdentifier: args.tokenIdentifier,
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
    });
  },
});

/**
 * Delete a user record.
 */
export const deleteUser = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.userId);
    return null;
  },
});

/**
 * Claim a guest account after signing in/up with Clerk.
 * Requires Clerk auth. Handles both happy path (upgrade in-place) and edge case (migrate threads).
 */
export const claimGuestAccount = action({
  args: { guestId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to claim guest account");
    }

    // Look up guest user
    const guestUser = await ctx.runQuery(internal.users.getGuestUserInternal, {
      guestId: args.guestId,
    });

    // Look up existing Clerk user
    const existingClerkUser = await ctx.runQuery(
      internal.users.getUserByTokenInternal,
      { tokenIdentifier: identity.tokenIdentifier }
    );

    if (!guestUser) {
      // No guest found - ensure Clerk user exists
      if (!existingClerkUser) {
        await ctx.runMutation(internal.users.storeInternal, {
          tokenIdentifier: identity.tokenIdentifier,
          name: identity.name ?? "Anonymous",
          email: identity.email,
          imageUrl: identity.pictureUrl,
        });
      }
      return { success: true };
    }

    if (!existingClerkUser) {
      // Happy path: no existing Clerk account, upgrade guest record in-place
      await ctx.runMutation(internal.users.upgradeGuestUser, {
        userId: guestUser._id,
        tokenIdentifier: identity.tokenIdentifier,
        name: identity.name ?? "Anonymous",
        email: identity.email,
        imageUrl: identity.pictureUrl,
      });
    } else {
      // Edge case: Clerk account already exists (returning user on new device)
      // Migrate guest threads to existing user
      const guestThreads = await ctx.runQuery(
        components.agent.threads.listThreadsByUserId,
        {
          userId: guestUser._id,
          paginationOpts: { cursor: null, numItems: 100 },
        }
      );

      for (const thread of guestThreads.page) {
        await ctx.runMutation(components.agent.threads.updateThread, {
          threadId: thread._id,
          patch: { userId: existingClerkUser._id },
        });
      }

      // Delete the guest record
      await ctx.runMutation(internal.users.deleteUser, {
        userId: guestUser._id,
      });
    }

    return { success: true };
  },
});
