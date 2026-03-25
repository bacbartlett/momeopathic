/**
 * @deprecated This module is no longer used by the frontend.
 * Live greeting generation is now handled by greetings.triggerGreeting.
 * Kept for backwards compatibility — safe to delete once no clients reference it.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { action, query } from "./_generated/server";

/**
 * Handle app open/foreground.
 * Checks for inactivity, pushes greeting if needed.
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
  },
  returns: v.object({
    action: v.string(),
    greeting: v.optional(v.string()),
    tier: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<HandleAppOpenResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated: Must be logged in");
    }

    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (!thread) {
      throw new Error("Thread not found");
    }
    if (thread.userId !== userId) {
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
 */
export const getAppOpenInfo = query({
  args: {},
  returns: v.object({
    needsGreeting: v.boolean(),
    showDivider: v.boolean(),
    tier: v.union(v.string(), v.null()),
    hasGreeting: v.boolean(),
    greeting: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args): Promise<GetAppOpenInfoResult> => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
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
