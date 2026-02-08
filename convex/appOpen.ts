import { saveMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { action, ActionCtx, query, QueryCtx } from "./_generated/server";

/**
 * App Open Flow
 *
 * When the app is opened/foregrounded, this handles:
 * 1. Check inactivity tier (30min, 4hour, 1week)
 * 2. Get cached greeting if available
 * 3. Push greeting to the user's current thread
 * 4. Return info for UI (should show divider, etc.)
 */

/**
 * Resolve user from action context.
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

    // Check inactivity tier
    const tier: string | null = await ctx.runQuery(internal.greetings.checkInactivityTier, {
      userId: user._id,
    }) as string | null;

    if (!tier) {
      // No significant inactivity, nothing to do
      return { action: "none" };
    }

    // Try to get cached greeting
    const cached = await ctx.runMutation(internal.greetings.consumeGreeting, {
      userId: user._id,
    }) as { greeting: string; tier: string } | null;

    if (!cached) {
      // No cached greeting available - generate one on-demand
      // This is the fallback path if the scheduled job didn't run
      // For now, return none and let the user initiate
      return { action: "none" };
    }

    // Push greeting to the thread
    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: user._id,
      message: {
        role: "assistant",
        content: cached.greeting,
      },
    });

    // Determine if we should show a divider (4hour+ gap)
    const showDivider: boolean = tier === "4hour" || tier === "1week";

    return {
      action: showDivider ? "greeting_with_divider" : "greeting",
      greeting: cached.greeting,
      tier: cached.tier,
    };
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

    // Check inactivity tier
    const tier: string | null = await ctx.runQuery(internal.greetings.checkInactivityTier, {
      userId: user._id,
    }) as string | null;

    if (!tier) {
      return {
        needsGreeting: false,
        showDivider: false,
        tier: null,
        hasGreeting: false,
        greeting: null,
      };
    }

    // Check if greeting is cached
    const cached = await ctx.runQuery(internal.greetings.getGreeting, {
      userId: user._id,
    }) as { greeting: string; tier: string } | null;

    return {
      needsGreeting: tier !== null,
      showDivider: tier === "4hour" || tier === "1week",
      tier,
      hasGreeting: cached !== null,
      greeting: cached?.greeting ?? null,
    };
  },
});
