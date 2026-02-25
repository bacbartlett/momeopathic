import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { homeopathicAgent } from "./agents/homeopathic";
import {
  action,
  ActionCtx,
  internalMutation,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DURATION_MS = 7 * DAY_MS;

interface ThreadPageResult {
  page: Array<{ _id: string }>;
  isDone: boolean;
  continueCursor: string;
}

function isDevMode(): boolean {
  return process.env.DEV_MODE === "true";
}

async function getCurrentUserFromQuery(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

async function getCurrentUserFromMutation(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function getCurrentUserFromAction(ctx: ActionCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const user = await ctx.runQuery(internal.threads.getUserByToken, {
    tokenIdentifier: identity.tokenIdentifier,
  });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export const recordFirstAppOpen = mutation({
  args: { deviceFingerprint: v.string() },
  returns: v.object({
    isFirstOpen: v.boolean(),
    alreadyUsedTrial: v.boolean(),
    firstAppOpen: v.number(),
    trialStarted: v.union(v.number(), v.null()),
    trialEndDate: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromMutation(ctx);

    if (typeof user.firstAppOpen === "number") {
      if (!user.deviceFingerprint) {
        await ctx.db.patch(user._id, { deviceFingerprint: args.deviceFingerprint });
      }
      return {
        isFirstOpen: false,
        alreadyUsedTrial: false,
        firstAppOpen: user.firstAppOpen,
        trialStarted: user.trialStarted ?? null,
        trialEndDate: user.trialEndDate ?? null,
      };
    }

    const now = Date.now();
    const fingerprintMatches = await ctx.db
      .query("users")
      .withIndex("by_deviceFingerprint", (q) => q.eq("deviceFingerprint", args.deviceFingerprint))
      .collect();

    const trialWasUsedOnAnotherAccount = fingerprintMatches.some(
      (match) => match._id !== user._id && typeof match.trialStarted === "number",
    );

    if (trialWasUsedOnAnotherAccount) {
      await ctx.db.patch(user._id, {
        firstAppOpen: now,
        deviceFingerprint: args.deviceFingerprint,
        trialStarted: now - TRIAL_DURATION_MS,
        trialEndDate: now - 1,
      });
      return {
        isFirstOpen: true,
        alreadyUsedTrial: true,
        firstAppOpen: now,
        trialStarted: now - TRIAL_DURATION_MS,
        trialEndDate: now - 1,
      };
    }

    await ctx.db.patch(user._id, {
      firstAppOpen: now,
      deviceFingerprint: args.deviceFingerprint,
    });

    return {
      isFirstOpen: true,
      alreadyUsedTrial: false,
      firstAppOpen: now,
      trialStarted: null,
      trialEndDate: null,
    };
  },
});

export const startTrial = mutation({
  args: {},
  returns: v.object({
    trialStarted: v.number(),
    trialEndDate: v.number(),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUserFromMutation(ctx);
    const now = Date.now();

    if (typeof user.trialStarted === "number" && typeof user.trialEndDate === "number") {
      return {
        trialStarted: user.trialStarted,
        trialEndDate: user.trialEndDate,
      };
    }

    const trialStarted = now;
    const trialEndDate = now + TRIAL_DURATION_MS;
    await ctx.db.patch(user._id, {
      trialStarted,
      trialEndDate,
    });

    return { trialStarted, trialEndDate };
  },
});

export const getTrialStatus = query({
  args: {
    isSubscribed: v.optional(v.boolean()),
  },
  returns: v.object({
    isFirstEverOpen: v.boolean(),
    shouldShowTrialModal: v.boolean(),
    isInTrial: v.boolean(),
    trialDaysRemaining: v.union(v.number(), v.null()),
    trialExpired: v.boolean(),
    isSubscribed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromQuery(ctx);

    if (!user) {
      return {
        isFirstEverOpen: false,
        shouldShowTrialModal: false,
        isInTrial: false,
        trialDaysRemaining: null,
        trialExpired: false,
        isSubscribed: args.isSubscribed === true,
      };
    }

    const now = Date.now();
    const hasSubscriptionAccess = args.isSubscribed === true || user.noPaywall === true;
    const isFirstEverOpen = typeof user.firstAppOpen !== "number";
    const shouldShowTrialModal =
      typeof user.firstAppOpen === "number" && typeof user.trialStarted !== "number";
    const hasTrialWindow =
      typeof user.trialStarted === "number" && typeof user.trialEndDate === "number";
    const isInTrial = hasTrialWindow && now < (user.trialEndDate ?? 0);

    let trialDaysRemaining: number | null = null;
    if (isInTrial && typeof user.trialEndDate === "number") {
      const remainingMs = Math.max(user.trialEndDate - now, 0);
      trialDaysRemaining = Math.max(1, Math.ceil(remainingMs / DAY_MS));
    }

    const trialExpired =
      hasTrialWindow && now >= (user.trialEndDate ?? 0) && !hasSubscriptionAccess;

    return {
      isFirstEverOpen,
      shouldShowTrialModal,
      isInTrial,
      trialDaysRemaining,
      trialExpired,
      isSubscribed: hasSubscriptionAccess,
    };
  },
});

export const checkDeviceFingerprint = query({
  args: { deviceFingerprint: v.string() },
  returns: v.object({
    alreadyUsedTrial: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserFromQuery(ctx);
    const matches = await ctx.db
      .query("users")
      .withIndex("by_deviceFingerprint", (q) => q.eq("deviceFingerprint", args.deviceFingerprint))
      .collect();

    const alreadyUsedTrial = matches.some(
      (match) =>
        match._id !== currentUser?._id &&
        typeof match.trialStarted === "number" &&
        typeof match.trialEndDate === "number",
    );

    return { alreadyUsedTrial };
  },
});

export const debugSimulateLockout = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (!isDevMode()) {
      throw new Error("Debug only");
    }

    const user = await getCurrentUserFromMutation(ctx);
    const now = Date.now();

    await ctx.db.patch(user._id, {
      firstAppOpen: user.firstAppOpen ?? now - TRIAL_DURATION_MS,
      trialStarted: user.trialStarted ?? now - TRIAL_DURATION_MS,
      trialEndDate: now - 1,
    });

    return null;
  },
});

export const resetTrialStateInternal = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!isDevMode()) {
      throw new Error("Debug only");
    }

    const cachedGreetings = await ctx.db
      .query("greetingCache")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const greeting of cachedGreetings) {
      await ctx.db.delete(greeting._id);
    }

    const pendingSchedules = await ctx.db
      .query("greetingSchedule")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const schedule of pendingSchedules) {
      try {
        await ctx.scheduler.cancel(schedule.scheduledId);
      } catch {
        // Ignore if already executed.
      }
      await ctx.db.delete(schedule._id);
    }

    await ctx.db.patch(args.userId, {
      firstAppOpen: undefined,
      trialStarted: undefined,
      trialEndDate: undefined,
      deviceFingerprint: undefined,
      disclaimerAccepted: undefined,
      lastActivityAt: undefined,
    });
    return null;
  },
});

export const debugResetTrial = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (!isDevMode()) {
      throw new Error("Debug only");
    }

    const user = await getCurrentUserFromAction(ctx);

    // Remove all user threads/messages so next boot behaves like first run.
    let cursor: string | null = null;
    do {
      const page: ThreadPageResult = await ctx.runQuery(
        components.agent.threads.listThreadsByUserId,
        {
        userId: user._id,
        paginationOpts: { cursor, numItems: 50 },
      },
      );

      for (const thread of page.page) {
        await homeopathicAgent.deleteThreadSync(ctx, { threadId: thread._id });
      }

      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor !== null);

    await ctx.runMutation(internal.trial.resetTrialStateInternal, {
      userId: user._id,
    });

    return null;
  },
});
