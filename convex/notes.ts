import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Get all notes for a user. Called by the agent's getNotes tool.
 */
export const getByUserId = internalQuery({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("notes"),
      _creationTime: v.number(),
      userId: v.string(),
      content: v.string(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

/**
 * Save or update the note for a user. Called by the agent's saveNote tool.
 * Each user has a single note document that gets upserted.
 */
export const upsert = internalMutation({
  args: {
    userId: v.string(),
    content: v.string(),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("notes", {
      userId: args.userId,
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});
