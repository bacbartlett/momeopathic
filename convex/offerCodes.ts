import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Validate and redeem an offer code for the current user
 */
export const redeem = mutation({
  args: {
    code: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Must be logged in to redeem offer codes");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found in database");
    }

    // Normalize code for comparison
    const normalizedCode = args.code.trim().toUpperCase();

    if (!normalizedCode) {
      return {
        success: false,
        message: "Please enter a valid offer code",
      };
    }

    // Find the offer code (case-insensitive search)
    // We fetch all codes and do case-insensitive matching in JavaScript
    // because Convex queries are case-sensitive
    const allCodes = await ctx.db.query("offerCodes").collect();
    const offerCode = allCodes.find(
      (code) => code.code.toUpperCase() === normalizedCode
    );

    if (!offerCode) {
      return {
        success: false,
        message: "Invalid offer code",
      };
    }

    // Check if code is active
    if (!offerCode.isActive) {
      return {
        success: false,
        message: "This offer code is no longer active",
      };
    }

    // Check if code has expired
    if (offerCode.expiresAt && offerCode.expiresAt <= Date.now()) {
      return {
        success: false,
        message: "This offer code has expired",
      };
    }

    // Check if user has already redeemed this code
    const existingRedemption = await ctx.db
      .query("offerCodeRedemptions")
      .withIndex("by_user_and_code", (q) =>
        q.eq("userId", user._id).eq("codeId", offerCode._id)
      )
      .first();

    if (existingRedemption) {
      return {
        success: false,
        message: "You have already redeemed this offer code",
      };
    }

    // Check if code has reached max uses
    if (offerCode.maxUses !== undefined && offerCode.usedCount >= offerCode.maxUses) {
      return {
        success: false,
        message: "This offer code has reached its maximum number of uses",
      };
    }

    // All validation passed - redeem the code!

    // 1. Grant the user access by setting noPaywall flag
    await ctx.db.patch(user._id, {
      noPaywall: true,
    });

    // 2. Record the redemption (store the actual code from database for consistency)
    await ctx.db.insert("offerCodeRedemptions", {
      codeId: offerCode._id,
      userId: user._id,
      codeString: offerCode.code,
    });

    // 3. Increment the used count
    await ctx.db.patch(offerCode._id, {
      usedCount: offerCode.usedCount + 1,
    });

    return {
      success: true,
      message: "Offer code redeemed successfully! You now have unlimited access.",
    };
  },
});

/**
 * Check if the current user has redeemed any offer codes
 */
export const getUserRedemptions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("offerCodeRedemptions"),
      _creationTime: v.number(),
      codeString: v.string(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("offerCodeRedemptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
