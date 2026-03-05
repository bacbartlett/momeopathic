import { createOpenAI } from "@ai-sdk/openai";
import { Agent, createTool } from "@convex-dev/agent";
import z from "zod";
import { api, components, internal } from "../_generated/api";
import { SearchRAGTextResult } from "../rag";
// Skills system commented out - dosing knowledge now in system prompt
// import { buildSkillsCatalog, skills } from "../skills";
import { systemPromptBase } from "./systemprompt";

const baseMasterPrompt = systemPromptBase;

// Create OpenAI-compatible client pointing to OpenRouter
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// ============================================
// MATERIA MEDICA TOOLS
// ============================================

const searchMateriaMedica = createTool({
  description: `Search the Materia Medica for remedies matching symptoms, conditions, or remedy names. Use this to find and confirm remedy recommendations.`,
  args: z.object({
    query: z
      .string()
      .describe("The symptom picture, condition, or remedy name to search for"),
  }),
  handler: async (ctx, args): Promise<SearchRAGTextResult> => {
    return await ctx.runAction(api.rag.searchRAGText, {
      namespace: "universal",
      searchFor: args.query,
    });
  },
});

const getLearnMoreLink = createTool({
  description:
    "Generate a link to learn more about a remedy. Returns an internal app link to view the remedy in the local Materia Medica. Only use when the user seems interested in going deeper — not on every recommendation.",
  args: z.object({
    nameOfRemedy: z
      .string()
      .describe("The name of the homeopathic remedy to link to"),
  }),
  handler: async (__, args): Promise<string> => {
    const normalizedName = args.nameOfRemedy.toUpperCase().trim();
    const urlName = args.nameOfRemedy.toLowerCase().replace(/ /g, "-");
    const externalUrl = `https://www.materiamedica.info/en/materia-medica/william-boericke/${urlName}`;
    const encodedName = encodeURIComponent(normalizedName);
    const encodedFallback = encodeURIComponent(externalUrl);
    return `mymateria://materia-medica?name=${encodedName}&fallback=${encodedFallback}`;
  },
});

// ============================================
// SKILLS TOOL (Commented out - dosing knowledge now in system prompt)
// ============================================

// const loadSkill = createTool({
//   description:
//     "Load a specialized knowledge skill into context. Call this BEFORE answering questions about dosing, potency, administration, or other skill topics. The skill content will guide your detailed responses.",
//   args: z.object({
//     skillName: z.string().describe("The name of the skill to load (e.g., 'dosing')"),
//   }),
//   handler: async (_ctx, args): Promise<string> => {
//     const skill = skills[args.skillName];
//     if (!skill) {
//       return `Skill "${args.skillName}" not found. Available skills: ${Object.keys(skills).join(", ")}`;
//     }
//     return skill.content;
//   },
// });

// ============================================
// NOTES TOOLS - Memory System
// ============================================

/**
 * Get full case history for pattern matching (beyond the 5 most recent pre-loaded in the system prompt).
 */
const getCaseHistory = createTool({
  description:
    "Retrieve the full case history for this user. The 5 most recent cases are already in your notes above — use this only when you need older history for deeper pattern matching. Returns cases with most recent first.",
  args: z.object({
    limit: z
      .number()
      .optional()
      .describe("Maximum number of cases to retrieve. Defaults to all."),
  }),
  handler: async (ctx, args): Promise<string> => {
    const userId = ctx.userId;
    if (!userId) {
      return "No user context available.";
    }

    const history = await ctx.runQuery(internal.notes.getCaseHistory, {
      userId,
      limit: args.limit,
    });

    if (history.length === 0) {
      return "No case history found for this user.";
    }

    return history
      .map((h: { createdAt: number; entry: string }) => {
        const date = new Date(h.createdAt).toLocaleDateString();
        return `[${date}] ${h.entry}`;
      })
      .join("\n");
  },
});

/**
 * Save or update user profile.
 */
const saveProfile = createTool({
  description:
    "Save or update the user's profile. Use this to remember personal details (names, ages, who they're caring for), chronic conditions, preferences (pellets vs water, where they buy remedies), and experience level. Overwrites the existing profile.",
  args: z.object({
    content: z
      .string()
      .describe(
        "The complete profile content. Include: names and ages of people they care for, chronic conditions, preferences, experience level with homeopathy.",
      ),
  }),
  handler: async (ctx, args): Promise<string> => {
    const userId = ctx.userId;
    if (!userId) {
      return "Could not save: no user context available.";
    }

    await ctx.runMutation(internal.notes.saveProfile, {
      userId,
      content: args.content,
    });

    return "Profile saved.";
  },
});

/**
 * Save or update active cases.
 */
const saveActiveCases = createTool({
  description:
    "Save or update active cases. Use this to track current issues being worked on, including: who has what, last remedy given, when, and what follow-up is needed. Overwrites existing active cases.",
  args: z.object({
    content: z
      .string()
      .describe(
        "The current active cases. Format: 'Name (age) - issue, remedy given, date, follow-up needed'. Include all active cases, or write 'No active cases' if resolved.",
      ),
  }),
  handler: async (ctx, args): Promise<string> => {
    const userId = ctx.userId;
    if (!userId) {
      return "Could not save: no user context available.";
    }

    await ctx.runMutation(internal.notes.saveActiveCases, {
      userId,
      content: args.content,
    });

    return "Active cases saved.";
  },
});

/**
 * Append to case history.
 */
const appendCaseHistory = createTool({
  description:
    "Log a case to history. Call this when a case resolves or reaches a meaningful conclusion. This is an append-only log — entries are never overwritten. Include: who, what issue, what remedy, outcome.",
  args: z.object({
    entry: z
      .string()
      .describe(
        "The case entry to log. Format: 'Name - issue - remedy - outcome'. Example: 'Timmy - fever - Belladonna 30C - resolved after 2 doses'",
      ),
  }),
  handler: async (ctx, args): Promise<string> => {
    const userId = ctx.userId;
    if (!userId) {
      return "Could not save: no user context available.";
    }

    await ctx.runMutation(internal.notes.appendCaseHistory, {
      userId,
      entry: args.entry,
    });

    return "Case logged to history.";
  },
});

/**
 * Save a lesson learned.
 */
const saveLesson = createTool({
  description:
    "Save a lesson learned about this user. Use this when you discover a pattern: a remedy that works particularly well for someone, a sensitivity to note, or an insight worth remembering. Lessons accumulate over time.",
  args: z.object({
    lesson: z
      .string()
      .describe(
        "The lesson to remember. Example: 'Timmy responds better to Pulsatilla than Chamomilla for teething' or 'Mom prefers water dosing for the baby'",
      ),
  }),
  handler: async (ctx, args): Promise<string> => {
    const userId = ctx.userId;
    if (!userId) {
      return "Could not save: no user context available.";
    }

    await ctx.runMutation(internal.notes.saveLesson, {
      userId,
      lesson: args.lesson,
    });

    return "Lesson saved.";
  },
});

// ============================================
// AGENT DEFINITION
// ============================================

const tools = {
  // Materia Medica
  searchMateriaMedica,
  getLearnMoreLink,
  // Skills - commented out, dosing now in system prompt
  // loadSkill,
  // Notes - Reading (profile, active cases, lessons, and last 5 cases are pre-loaded in the system prompt)
  getCaseHistory,
  // Notes - Writing
  saveProfile,
  saveActiveCases,
  appendCaseHistory,
  saveLesson,
};

export const homeopathicAgent = new Agent(components.agent, {
  name: "Homeopathic Assistant",
  languageModel: openrouter.chat("anthropic/claude-sonnet-4.6"),
  // Skills catalog removed - dosing knowledge now in system prompt
  instructions: baseMasterPrompt,
  maxSteps: 10,
  tools,
});
