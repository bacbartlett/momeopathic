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
  // Greeting system fields
  lastActivityAt: v.optional(v.number()),
  timezone: v.optional(v.string()),
  // Trial fields
  firstAppOpen: v.optional(v.number()),
  trialStarted: v.optional(v.number()),
  trialEndDate: v.optional(v.number()),
  deviceFingerprint: v.optional(v.string()),
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
    const users = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .collect();

    // Clean up duplicates if they exist (keep the oldest record)
    if (users.length > 1) {
      const [keep, ...duplicates] = users;
      for (const dup of duplicates) {
        await ctx.db.delete(dup._id);
      }
    }

    const user = users[0] ?? null;

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
 * Restricted to the authenticated user's own record.
 */
export const getById = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(userReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    // Only allow fetching your own record
    if (user.tokenIdentifier !== identity.tokenIdentifier) {
      return null;
    }
    return user;
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

/**
 * Accept disclaimer for a guest user (no auth required, uses guestId).
 */
export const acceptDisclaimerAsGuest = mutation({
  args: { guestId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_guestId", (q) => q.eq("guestId", args.guestId))
      .unique();

    if (!user) {
      throw new Error("Guest user not found");
    }

    await ctx.db.patch(user._id, { disclaimerAccepted: true });
    return null;
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
 * Merge important fields from a guest record into an authenticated user record.
 * Called during the merge path of claimGuestAccount when the guest record will be deleted.
 * Only copies fields that the target user doesn't already have set.
 */
export const mergeGuestFieldsIntoUser = internalMutation({
  args: {
    targetUserId: v.id("users"),
    disclaimerAccepted: v.optional(v.boolean()),
    lastActivityAt: v.optional(v.number()),
    timezone: v.optional(v.string()),
    firstAppOpen: v.optional(v.number()),
    trialStarted: v.optional(v.number()),
    trialEndDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetUserId);
    if (!target) return null;

    const patch: Record<string, unknown> = {};
    if (args.disclaimerAccepted && !target.disclaimerAccepted) {
      patch.disclaimerAccepted = args.disclaimerAccepted;
    }
    if (args.lastActivityAt && !target.lastActivityAt) {
      patch.lastActivityAt = args.lastActivityAt;
    }
    if (args.timezone && !target.timezone) {
      patch.timezone = args.timezone;
    }
    if (args.firstAppOpen && !target.firstAppOpen) {
      patch.firstAppOpen = args.firstAppOpen;
    }
    if (args.trialStarted && !target.trialStarted) {
      patch.trialStarted = args.trialStarted;
    }
    if (args.trialEndDate && !target.trialEndDate) {
      patch.trialEndDate = args.trialEndDate;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.targetUserId, patch);
    }
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

    // Validate: only allow claiming actual guest accounts that haven't been
    // claimed by a different authenticated user already.
    if (!guestUser.isGuest) {
      // This is not a guest account — someone is trying to claim a real user's data.
      return { success: false };
    }
    // Check if another real (non-guest) user already claimed this guest account.
    // Guest users have synthetic tokenIdentifiers like "guest:abc-123" — skip those.
    const hasRealToken = guestUser.tokenIdentifier && !guestUser.tokenIdentifier.startsWith("guest:");
    if (hasRealToken && guestUser.tokenIdentifier !== identity.tokenIdentifier) {
      // Guest was already claimed by a different authenticated user.
      return { success: false };
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

      // Preserve important fields from guest record before deleting it
      await ctx.runMutation(internal.users.mergeGuestFieldsIntoUser, {
        targetUserId: existingClerkUser._id,
        disclaimerAccepted: guestUser.disclaimerAccepted,
        lastActivityAt: guestUser.lastActivityAt,
        timezone: guestUser.timezone,
        firstAppOpen: guestUser.firstAppOpen,
        trialStarted: guestUser.trialStarted,
        trialEndDate: guestUser.trialEndDate,
      });

      // Delete the guest record
      await ctx.runMutation(internal.users.deleteUser, {
        userId: guestUser._id,
      });
    }

    return { success: true };
  },
});
