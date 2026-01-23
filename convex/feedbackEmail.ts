"use node";

import { v } from "convex/values";
import { Resend } from "resend";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

// Maximum feedback length (50KB)
const MAX_FEEDBACK_LENGTH = 51200;

/**
 * Submit negative feedback via email using Resend.
 */
export const submitFeedback = action({
  args: {
    feedback: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Unauthenticated" };
    }

    // Validate feedback length
    if (args.feedback.length > MAX_FEEDBACK_LENGTH) {
      return { success: false, error: `Feedback too long. Maximum length is ${MAX_FEEDBACK_LENGTH} characters.` };
    }
    if (args.feedback.trim().length === 0) {
      return { success: false, error: "Feedback cannot be empty." };
    }

    // Get user info and mark feedback as given
    const user = await ctx.runMutation(internal.feedback.getUserForFeedback, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get Resend API key from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      // Still mark feedback as given but note the email wasn't sent
      return { success: true, error: "Email service not configured" };
    }

    const feedbackEmail = process.env.FEEDBACK_EMAIL ?? "feedback@brandonb.dev";

    try {
      const resend = new Resend(resendApiKey);

      const { error } = await resend.emails.send({
        from: "My Materia App <noreplybrandonb.dev>",
        to: feedbackEmail,
        subject: "App Feedback from User",
        text: `
User Feedback Received
======================

User: ${user.name}
Email: ${user.email ?? "Not provided"}
User ID: ${user.id}

Feedback:
---------
${args.feedback}

---
Sent from My Materia App
        `.trim(),
      });

      if (error) {
        console.error("Failed to send feedback email:", error);
        return { success: true, error: "Failed to send email, but feedback recorded" };
      }

      return { success: true };
    } catch (error) {
      console.error("Error sending feedback email:", error);
      return { success: true, error: "Failed to send email, but feedback recorded" };
    }
  },
});
