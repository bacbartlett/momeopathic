/**
 * Admin utilities for pre-creating user accounts.
 *
 * Usage (from CLI):
 *   npx convex run admin:createUser '{"email":"user@example.com","password":"tempPass123!","name":"Jane Doe"}'
 *
 * For batch creation, script a loop over a list of users.
 */
import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { createAccount } from "@convex-dev/auth/server";

/**
 * Create a new user account with email + password via Convex Auth.
 * This is an internal action — invoke via `npx convex run`.
 */
export const createUser = internalAction({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name ?? "User";

    // Use createAccount from @convex-dev/auth to register the account
    await createAccount(ctx, {
      provider: "password",
      account: {
        id: args.email,
        secret: args.password,
      },
      profile: {
        email: args.email,
        name,
      },
      shouldLinkViaEmail: false,
    });

    return { success: true, email: args.email };
  },
});

/**
 * Set the name on a user record by email (used after account creation).
 */
export const setUserName = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { name: args.name });
    }
  },
});
