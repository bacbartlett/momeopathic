import { listMessages, saveMessage } from "@convex-dev/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  action,
  ActionCtx,
  internalMutation,
  internalQuery,
} from "./_generated/server";

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

const greetingTierValidator = v.union(
  v.literal("30min"),
  v.literal("4hour"),
  v.literal("1week"),
);


// Inactivity tiers (in milliseconds)
const INACTIVITY_TIERS = {
  "30min": 30 * 60 * 1000,
  "4hour": 4 * 60 * 60 * 1000,
  "1week": 7 * 24 * 60 * 60 * 1000,
} as const;

// ============================================
// HELPERS
// ============================================

// OpenRouter client for greeting generation (same as titleGenerator)
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// ============================================
// INTERNAL QUERIES
// ============================================

export const getUserContext = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    profile: v.optional(v.string()),
    activeCases: v.optional(v.string()),
    recentHistory: v.array(v.string()),
    lessons: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const activeCases = await ctx.db
      .query("activeCases")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const caseHistory = await ctx.db
      .query("caseHistory")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);

    const lessons = await ctx.db
      .query("lessonsLearned")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);

    return {
      profile: profile?.content,
      activeCases: activeCases?.content,
      recentHistory: caseHistory.map((h) => h.entry),
      lessons: lessons.map((l) => l.lesson),
    };
  },
});

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), userDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const checkInactivityTier = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), greetingTierValidator),
  handler: async (
    ctx,
    args,
  ): Promise<"30min" | "4hour" | "1week" | null> => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const now = Date.now();
    const lastActivity = user.lastActivityAt || 0;
    const gap = now - lastActivity;

    if (gap >= INACTIVITY_TIERS["1week"]) return "1week";
    if (gap >= INACTIVITY_TIERS["4hour"]) return "4hour";
    if (gap >= INACTIVITY_TIERS["30min"]) return "30min";
    return null;
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

export const updateLastActivity = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      lastActivityAt: Date.now(),
    });
    return null;
  },
});

// ============================================
// PUBLIC API
// ============================================

/**
 * Resolve user from action context. Tries Clerk auth first, falls back to guestId.
 */
async function resolveUserFromAction(
  ctx: ActionCtx,
  guestId?: string,
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
 * Live greeting generation on app open.
 * Checks if user has been inactive 30+ minutes, generates a greeting if so.
 */
export const triggerGreeting = action({
  args: {
    threadId: v.string(),
    guestId: v.optional(v.string()),
  },
  returns: v.object({
    generated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await resolveUserFromAction(ctx, args.guestId);

    // Check inactivity tier
    const tier = await ctx.runQuery(internal.greetings.checkInactivityTier, {
      userId: user._id,
    }) as string | null;

    if (!tier) {
      return { generated: false };
    }

    // Verify thread ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (!thread || thread.userId !== user._id) {
      return { generated: false };
    }

    // Fetch user context and notes
    const [context, notes] = await Promise.all([
      ctx.runQuery(internal.greetings.getUserContext, { userId: user._id }),
      ctx.runQuery(internal.notes.getNotes, { userId: user._id as string }),
    ]);

    // Fetch recent messages for conversational context
    const recentMsgs = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: { cursor: null, numItems: 20 },
    });

    // Build conversational context from recent messages
    let conversationContext = "";
    if (recentMsgs.page.length > 0) {
      const msgSummaries = recentMsgs.page
        .filter((m: Record<string, any>) => {
          const role = m.message?.role;
          return role === "user" || role === "assistant";
        })
        .slice(-10)
        .map((m: Record<string, any>) => {
          const role = m.message?.role;
          const content = typeof m.message?.content === "string"
            ? m.message.content
            : Array.isArray(m.message?.content)
              ? m.message.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ")
              : "";
          return `${role}: ${content.slice(0, 200)}`;
        });
      if (msgSummaries.length > 0) {
        conversationContext = `\n\nRecent conversation:\n${msgSummaries.join("\n")}`;
      }
    }

    // Build the generation prompt
    const hasAnyContext = context.profile || context.activeCases || context.recentHistory.length > 0;
    const awayDuration = tier === "1week" ? "about a week" : tier === "4hour" ? "a few hours" : "a little while";

    let prompt = `You're texting a friend who you also help with homeopathy. They just opened the app after being away for ${awayDuration}. Write a short, natural check-in message (1-2 sentences max).`;

    if (hasAnyContext) {
      prompt += `\n\nHere is what you know about them (ONLY reference things listed here — never assume or invent details):\n`;

      if (context.profile) {
        prompt += `\nProfile: ${context.profile}`;
      }
      if (context.activeCases) {
        prompt += `\nActive cases: ${context.activeCases}`;
      }
      if (context.recentHistory.length > 0) {
        prompt += `\nRecent history: ${context.recentHistory.slice(0, 2).join("; ")}`;
      }
    } else {
      prompt += `\n\nYou don't know anything about this person yet. Keep it simple and general. Do NOT assume they have children or any specific situation.`;
    }

    if (notes) {
      if (notes.profile) prompt += `\nNotes - Profile: ${notes.profile}`;
      if (notes.activeCases) prompt += `\nNotes - Active cases: ${notes.activeCases}`;
      if (notes.lessonsLearned && notes.lessonsLearned.length > 0) {
        prompt += `\nNotes - Lessons: ${notes.lessonsLearned.slice(0, 3).join("; ")}`;
      }
    }

    prompt += conversationContext;

    prompt += `\n\nTone & style:`;
    prompt += `\n- Talk like a real friend, not a customer service agent. Think: how would you text a close friend you bumped into?`;
    prompt += `\n- If they had something going on, ask about it directly: "How is [thing]?" or "Is [thing] feeling better?" — NOT "I see you were dealing with..." or "I noticed you mentioned..."`;
    prompt += `\n- No exclamation marks. Calm, warm, human.`;
    prompt += `\n- Do NOT reference the time of day ("Good morning", "Good evening", etc.) — you don't know the user's timezone.`;
    prompt += `\n- Jump right in. No "Welcome back", "Good to see you", "Hope you're doing well", or other filler.`;
    prompt += `\n- Generate ONLY the message body (1-2 sentences).`;

    try {
      const result = await generateText({
        model: openrouter.chat("anthropic/claude-haiku-4.5"),
        prompt,
      });

      const fullGreeting = result.text.trim();

      // Save as assistant message to the thread
      await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        userId: user._id,
        message: {
          role: "assistant",
          content: fullGreeting,
        },
      });

      // Update last activity so next open within 30min won't re-greet
      await ctx.runMutation(internal.greetings.updateLastActivity, {
        userId: user._id,
      });

      return { generated: true };
    } catch (error) {
      console.error(`Failed to generate live greeting for user ${user._id}:`, error);
      return { generated: false };
    }
  },
});
