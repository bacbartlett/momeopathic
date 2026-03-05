/**
 * @deprecated This module is no longer used by the frontend.
 * Live greeting generation is now handled by greetings.triggerGreeting.
 * Kept for backwards compatibility — safe to delete once no clients reference it.
 */

import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { action, ActionCtx, query, QueryCtx } from "./_generated/server";

/**
 * Resolve user from action context. Tries Clerk auth first, falls back to guestId.
 */
async function resolveUserFromAction(
  ctx: ActionCtx,
  guestId?: string
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.runQuery(internal.threads.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (user) return user;
  }

  if (guestId) {
    const user = await ctx.runQuery(internal.threads.getGuestUserByGuestId, {
      guestId,
    });
    if (user) return user;
  }

  throw new Error("Unauthenticated: Must be logged in or have a guest session");
}

/**
 * Resolve user from query context.
 */
async function resolveUserFromQuery(
  ctx: QueryCtx,
  guestId?: string
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (user) return user;
  }

  if (guestId) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_guestId", (q) => q.eq("guestId", guestId))
      .unique();
    if (user) return user;
  }

  return null;
}

/**
 * Handle app open/foreground.
 * Checks for inactivity, pushes greeting if needed.
 *
 * Returns:
 * - action: "none" | "greeting" | "greeting_with_divider"
 * - greeting: the greeting message (if any)
 * - tier: the inactivity tier that triggered this
 */
// Return type for handleAppOpen
interface HandleAppOpenResult {
  action: string;
  greeting?: string;
  tier?: string;
}

export const handleAppOpen = action({
  args: {
    threadId: v.string(),
    guestId: v.optional(v.string()),
  },
  returns: v.object({
    action: v.string(),
    greeting: v.optional(v.string()),
    tier: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<HandleAppOpenResult> => {
    const user = await resolveUserFromAction(ctx, args.guestId);

    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (!thread) {
      throw new Error("Thread not found");
    }
    if (thread.userId !== user._id) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    // Deprecated: greeting cache system removed. Use greetings.triggerGreeting instead.
    return { action: "none" };
  },
});

// Return type for getAppOpenInfo
interface GetAppOpenInfoResult {
  needsGreeting: boolean;
  showDivider: boolean;
  tier: string | null;
  hasGreeting: boolean;
  greeting: string | null;
}

/**
 * Get app open info without pushing greeting.
 * Use this to check what action is needed before committing.
 */
export const getAppOpenInfo = query({
  args: {
    guestId: v.optional(v.string()),
  },
  returns: v.object({
    needsGreeting: v.boolean(),
    showDivider: v.boolean(),
    tier: v.union(v.string(), v.null()),
    hasGreeting: v.boolean(),
    greeting: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args): Promise<GetAppOpenInfoResult> => {
    const user = await resolveUserFromQuery(ctx, args.guestId);

    if (!user) {
      return {
        needsGreeting: false,
        showDivider: false,
        tier: null,
        hasGreeting: false,
        greeting: null,
      };
    }

    // Deprecated: greeting cache system removed. Use greetings.triggerGreeting instead.
    return {
      needsGreeting: false,
      showDivider: false,
      tier: null,
      hasGreeting: false,
      greeting: null,
    };
  },
});
