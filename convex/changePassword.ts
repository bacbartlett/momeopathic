import { getAuthUserId, modifyAccountCredentials } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal query to get user email for the password change action.
 */
export const getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.email ?? null;
  },
});

/**
 * Change the authenticated user's password directly.
 *
 * ALPHA NOTE: This skips email verification and current password verification
 * since the user is already authenticated. Before production release, we should
 * add one or both of:
 *   - Current password verification (via retrieveAccount)
 *   - Email verification code flow (via the "reset" / "reset-verification" flows)
 *
 * TODO: Add current password verification before GA release
 * TODO: Add option to invalidate other sessions after password change
 */
export const changePassword = action({
  args: {
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate password requirements
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Get the user's email to identify their password account
    const email = await ctx.runQuery(
      internal.changePassword.getUserEmail,
      { userId },
    );

    if (!email) {
      throw new Error("User not found or missing email");
    }

    // Update the password (modifyAccountCredentials handles hashing via the
    // Password provider's crypto config automatically)
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: email,
        secret: args.newPassword,
      },
    });

    return null;
  },
});
