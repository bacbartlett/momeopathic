import { saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  action,
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { homeopathicAgent } from "./agents/homeopathic";

const MAX_GUEST_THREADS = 3;
const FIRST_TIME_GREETING = `Hi! I'm your homeopathy study partner.

I'm here to help you find the right remedy when you're not sure what to reach for, whether it's 2 PM or 2 AM.

I'm trained on Boericke's Materia Medica (the classic reference since 1927), and I'm built for moms (and dads!) like you who want to help their families naturally but don't have years to study.

You can ask me things like:
- "My toddler has a runny nose and won't stop whining"
- "What's the difference between Belladonna and Aconite?"
- "Help, teething is destroying us"

I'm not a doctor, and I'll try to tell you when something needs real medical attention. But when you're wondering which remedy to reach for, I've got you.

Try it - what's going on today?`;
const userDocValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  tokenIdentifier: v.string(),
  name: v.string(),
  email: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  disclaimerAccepted: v.optional(v.boolean()),
  noPaywall: v.optional(v.boolean()),
  feedbackThreadCount: v.optional(v.number()),
  feedbackDismissCount: v.optional(v.number()),
  feedbackGiven: v.optional(v.boolean()),
  isGuest: v.optional(v.boolean()),
  guestId: v.optional(v.string()),
  guestThreadCount: v.optional(v.number()),
  lastActivityAt: v.optional(v.number()),
  timezone: v.optional(v.string()),
  firstAppOpen: v.optional(v.number()),
  trialStarted: v.optional(v.number()),
  trialEndDate: v.optional(v.number()),
  deviceFingerprint: v.optional(v.string()),
});
const threadDocValidator = v.object({
  _creationTime: v.number(),
  _id: v.string(),
  status: v.union(v.literal("active"), v.literal("archived")),
  summary: v.optional(v.string()),
  title: v.optional(v.string()),
  userId: v.optional(v.string()),
});
const paginatedThreadsValidator = v.object({
  continueCursor: v.string(),
  isDone: v.boolean(),
  page: v.array(threadDocValidator),
  pageStatus: v.optional(
    v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
  ),
  splitCursor: v.optional(v.union(v.string(), v.null())),
});

// ============================================================
// Dual-auth user resolution helpers
// ============================================================

/**
 * Resolve user from query context. Tries Clerk auth first, falls back to guestId.
 */
async function resolveUserFromQuery(
  ctx: QueryCtx,
  guestId?: string,
): Promise<Doc<"users">> {
  // Try Clerk auth first
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user) return user;
  }

  // Fall back to guestId
  if (guestId) {
    const guest = await ctx.db
      .query("users")
      .withIndex("by_guestId", (q) => q.eq("guestId", guestId))
      .unique();
    if (guest) return guest;
  }

  throw new Error("Unauthenticated: Must be logged in or have a guest session");
}

/**
 * Resolve user from mutation context. Tries Clerk auth first, falls back to guestId.
 */
async function resolveUserFromMutation(
  ctx: MutationCtx,
  guestId?: string,
): Promise<Doc<"users">> {
  // Try Clerk auth first
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user) return user;
  }

  // Fall back to guestId
  if (guestId) {
    const guest = await ctx.db
      .query("users")
      .withIndex("by_guestId", (q) => q.eq("guestId", guestId))
      .unique();
    if (guest) return guest;
  }

  throw new Error("Unauthenticated: Must be logged in or have a guest session");
}

/**
 * Resolve user from action context. Tries Clerk auth first, falls back to guestId.
 */
async function resolveUserFromAction(
  ctx: ActionCtx,
  guestId?: string,
): Promise<Doc<"users">> {
  // Try Clerk auth first
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.runQuery(internal.threads.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (user) return user;
  }

  // Fall back to guestId
  if (guestId) {
    const user = await ctx.runQuery(internal.threads.getGuestUserByGuestId, {
      guestId,
    });
    if (user) return user;
  }

  throw new Error("Unauthenticated: Must be logged in or have a guest session");
}

// ============================================================
// Internal queries used by action-context helpers
// ============================================================

/**
 * Internal query to get user by token identifier.
 * Used by actions that need to look up the current user (actions can't access db directly).
 */
export const getUserByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.union(v.null(), userDocValidator),
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
  },
});

/**
 * Internal query to get guest user by guestId.
 */
export const getGuestUserByGuestId = internalQuery({
  args: { guestId: v.string() },
  returns: v.union(v.null(), userDocValidator),
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_guestId", (q) => q.eq("guestId", args.guestId))
      .unique();
  },
});

// ============================================================
// Guest thread count helpers
// ============================================================

export const incrementGuestThreadCount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user && user.isGuest) {
      await ctx.db.patch(args.userId, {
        guestThreadCount: (user.guestThreadCount ?? 0) + 1,
      });
    }
    return null;
  },
});

export const decrementGuestThreadCount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user && user.isGuest) {
      await ctx.db.patch(args.userId, {
        guestThreadCount: Math.max((user.guestThreadCount ?? 0) - 1, 0),
      });
    }
    return null;
  },
});

// ============================================================
// Thread helpers
// ============================================================

/**
 * Helper function to check if a thread is empty (has no user messages).
 * Returns true if the thread only contains assistant/system messages.
 */
async function isThreadEmpty(
  ctx: ActionCtx,
  threadId: string,
): Promise<boolean> {
  try {
    const messages = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        threadId,
        order: "asc",
        paginationOpts: { cursor: null, numItems: 100 },
        excludeToolMessages: false,
      },
    );

    // Check if there are any user messages
    const hasUserMessage = messages.page.some((msg) => {
      if (!msg.message || typeof msg.message !== "object") {
        return false;
      }
      if ("role" in msg.message) {
        return msg.message.role === "user";
      }
      return false;
    });

    return !hasUserMessage;
  } catch (error) {
    console.error(`Error checking if thread ${threadId} is empty:`, error);
    return false;
  }
}

/**
 * Internal action to cleanup empty threads for a user.
 * Scheduled to run after thread creation to avoid dangling promises.
 * Keeps the most recently created empty thread, deletes all older empty threads.
 */
export const cleanupEmptyThreads = internalAction({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Get all threads for the user
      const threadsResult = await ctx.runQuery(
        components.agent.threads.listThreadsByUserId,
        {
          userId: args.userId,
          paginationOpts: { cursor: null, numItems: 100 },
        },
      );

      // Find all empty threads
      const emptyThreads: Array<{ id: string; creationTime: number }> = [];
      for (const thread of threadsResult.page) {
        const isEmpty = await isThreadEmpty(ctx, thread._id);
        if (isEmpty) {
          emptyThreads.push({
            id: thread._id,
            creationTime: thread._creationTime,
          });
        }
      }

      // Sort by creation time descending (most recent first)
      emptyThreads.sort((a, b) => b.creationTime - a.creationTime);

      // Delete all empty threads except the most recent one
      for (let i = 1; i < emptyThreads.length; i++) {
        try {
          await homeopathicAgent.deleteThreadSync(ctx, {
            threadId: emptyThreads[i].id,
          });
        } catch (error) {
          console.error(
            `Error deleting empty thread ${emptyThreads[i].id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Error during empty thread cleanup:", error);
    }
    return null;
  },
});

// Maximum length for title and summary
const MAX_TITLE_LENGTH = 200;
const MAX_SUMMARY_LENGTH = 1000;

// Create a new thread for the authenticated user (or guest)
export const create = action({
  args: {
    title: v.optional(v.string()),
    guestId: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate title length if provided
    if (args.title && args.title.length > MAX_TITLE_LENGTH) {
      throw new Error(
        `Title too long. Maximum length is ${MAX_TITLE_LENGTH} characters.`,
      );
    }
    const user = await resolveUserFromAction(ctx, args.guestId);

    // Guest thread limit check
    if (user.isGuest) {
      if ((user.guestThreadCount ?? 0) >= MAX_GUEST_THREADS) {
        throw new Error("GUEST_LIMIT_REACHED");
      }
    }

    // Create thread using the agent's createThread method
    const { threadId } = await homeopathicAgent.createThread(ctx, {
      userId: user._id,
      title: args.title,
    });

    // Add initial greeting message from the AI directly as an assistant message
    // await saveMessage(ctx, components.agent, {
    //   threadId,
    //   userId: user._id,
    //   message: {
    //     role: "assistant",
    //     content: "Hello, how can I help you today?",
    //   },
    // });

    // Increment guest thread count
    if (user.isGuest) {
      await ctx.runMutation(internal.threads.incrementGuestThreadCount, {
        userId: user._id,
      });
    }

    // Schedule cleanup of empty threads
    await ctx.scheduler.runAfter(0, internal.threads.cleanupEmptyThreads, {
      userId: user._id,
    });

    return { threadId };
  },
});

// ============================================================
// Single-Thread Model: Get or Create
// ============================================================

// Type for greeting info from internal query
interface GreetingInfo {
  greeting: string;
  tier: string;
  showDivider: boolean;
}

// Return type for getOrCreate
interface GetOrCreateResult {
  threadId: string;
  isNew: boolean;
}

/**
 * Get the user's single thread, or create one if none exists.
 * This is the main entry point for the single-thread chat model.
 *
 * Returns:
 * - threadId: The thread to use
 * - isNew: Whether this is a brand new thread (no prior messages)
 */
export const getOrCreate = action({
  args: {
    guestId: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args): Promise<GetOrCreateResult> => {
    const user = await resolveUserFromAction(ctx, args.guestId);

    // Try to get existing thread
    const threadsResult = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: user._id,
        paginationOpts: { cursor: null, numItems: 1 },
      },
    );

    // If user has a thread, return it with greeting info
    if (threadsResult.page.length > 0) {
      const thread = threadsResult.page[0];

      // Get greeting info (explicit cast to avoid circular type inference)
      const greetingInfo = (await ctx.runQuery(
        internal.greetings.getGreetingForThread,
        {
          userId: user._id,
        },
      )) as GreetingInfo | null;

      // If there's a greeting, INSERT it as a message so it shows via sync
      if (greetingInfo?.greeting) {
        await saveMessage(ctx, components.agent, {
          threadId: thread._id,
          userId: user._id,
          message: {
            role: "assistant",
            content: greetingInfo.greeting,
          },
        });

        // Clear the cached greeting so it doesn't repeat
        await ctx.runMutation(internal.greetings.clearGreetingCache, {
          userId: user._id,
        });
      }

      return {
        threadId: thread._id as string,
        isNew: false,
      };
    }

    // No existing thread - create one
    const { threadId } = await homeopathicAgent.createThread(ctx, {
      userId: user._id,
      title: "Chat",
    });

    const shouldUseFirstTimeGreeting = !user.isGuest && typeof user.trialStarted !== "number";
    const initialGreeting = shouldUseFirstTimeGreeting
      ? FIRST_TIME_GREETING
      : "Hello! I'm here to help you find the right homeopathic remedies for your family. What's going on?";

    // Add initial greeting message
    await saveMessage(ctx, components.agent, {
      threadId,
      userId: user._id,
      message: {
        role: "assistant",
        content: initialGreeting,
      },
    });

    // Increment guest thread count if applicable
    if (user.isGuest) {
      await ctx.runMutation(internal.threads.incrementGuestThreadCount, {
        userId: user._id,
      });
    }

    // Return greeting so UI can display immediately (avoids timing issues with saveMessage)
    return {
      threadId,
      isNew: true,
    };
  },
});

// List all threads for the authenticated user (or guest)
export const list = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
    guestId: v.optional(v.string()),
  },
  returns: paginatedThreadsValidator,
  handler: async (ctx, args) => {
    // Try to resolve user, return empty for unauthenticated
    let user: Doc<"users"> | null = null;
    try {
      user = await resolveUserFromQuery(ctx, args.guestId);
    } catch {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // List threads filtering by the user's database ID
    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: user._id,
        paginationOpts: args.paginationOpts ?? { cursor: null, numItems: 50 },
      },
    );
    return threads;
  },
});

// Get a specific thread (only if it belongs to the user)
export const get = query({
  args: {
    threadId: v.string(),
    guestId: v.optional(v.string()),
  },
  returns: v.union(v.null(), threadDocValidator),
  handler: async (ctx, args) => {
    const user = await resolveUserFromQuery(ctx, args.guestId);

    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    // Verify the thread belongs to the user
    if (thread && thread.userId !== user._id) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    return thread ?? null;
  },
});

// Delete a thread (only if it belongs to the user)
export const remove = action({
  args: {
    threadId: v.string(),
    guestId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await resolveUserFromAction(ctx, args.guestId);

    // Get the thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    if (thread.userId !== user._id) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    await homeopathicAgent.deleteThreadSync(ctx, { threadId: args.threadId });

    // Decrement guest thread count
    if (user.isGuest) {
      await ctx.runMutation(internal.threads.decrementGuestThreadCount, {
        userId: user._id,
      });
    }

    return { success: true };
  },
});

// Update thread metadata (title/summary) - only if owned by user
export const updateMetadata = mutation({
  args: {
    threadId: v.string(),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    guestId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (args.title && args.title.length > MAX_TITLE_LENGTH) {
      throw new Error(
        `Title too long. Maximum length is ${MAX_TITLE_LENGTH} characters.`,
      );
    }
    if (args.summary && args.summary.length > MAX_SUMMARY_LENGTH) {
      throw new Error(
        `Summary too long. Maximum length is ${MAX_SUMMARY_LENGTH} characters.`,
      );
    }
    const user = await resolveUserFromMutation(ctx, args.guestId);

    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    if (thread.userId !== user._id) {
      throw new Error("Access denied: Thread does not belong to current user");
    }

    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: {
        title: args.title,
        summary: args.summary,
      },
    });
    return { success: true };
  },
});
