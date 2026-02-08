import { createOpenAI } from "@ai-sdk/openai";
import { Agent, createTool } from "@convex-dev/agent";
import z from "zod";
import { api, components, internal } from "../_generated/api";
import { SearchRAGTextResult } from "../rag";
import { buildSkillsCatalog, skills } from "../skills";
import { systemPrompt } from "./systemprompt";

const baseMasterPrompt = systemPrompt

// Create OpenAI-compatible client pointing to OpenRouter
// OpenRouter provides full OpenAI API compatibility
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const searchMateriaMedica = createTool({
  description: `Search a Materia Medica`,
  args: z.object({
    query: z.string(),
  }),
  handler: async (ctx, args): Promise<SearchRAGTextResult> => {
    console.log("[TOOL CALL] searchMateriaMedica invoked with query:", args.query);
    const result = await ctx.runAction(api.rag.searchRAGText, {namespace: 'universal', searchFor: args.query});
    console.log("[TOOL CALL] searchMateriaMedica result count:", Array.isArray(result) ? result.length : "non-array");
    return result;
  }
})

const getLearnMoreLink = createTool({
  description: 'Generate a link to learn more about a remedy. Returns an internal app link to view the remedy in the local Materia Medica. If the remedy is not found locally, the app will fall back to the external web link.',
  args: z.object({
    nameOfRemedy: z.string().describe('The name of the homeopathic remedy to link to')
  }),
  handler: async (__, args): Promise<string> => {
    console.log("[TOOL CALL] getLearnMoreLink invoked with nameOfRemedy:", args.nameOfRemedy);
    // Normalize the remedy name to match local database format (UPPERCASE with spaces)
    const normalizedName = args.nameOfRemedy.toUpperCase().trim();

    // Generate the external fallback URL
    const urlName = args.nameOfRemedy.toLowerCase().replace(/ /g, '-');
    const externalUrl = `https://www.materiamedica.info/en/materia-medica/william-boericke/${urlName}`;

    // Return internal app link with fallback encoded
    // Format: mymateria://materia-medica?name=REMEDY_NAME&fallback=ENCODED_URL
    // The app will try to find the remedy locally first, then use the fallback if not found
    const encodedName = encodeURIComponent(normalizedName);
    const encodedFallback = encodeURIComponent(externalUrl);

    const link = `mymateria://materia-medica?name=${encodedName}&fallback=${encodedFallback}`;
    console.log("[TOOL CALL] getLearnMoreLink result:", link);
    return link;
  }
})

const loadSkill = createTool({
  description:
    "Load a specialized knowledge skill into context. Call this BEFORE answering questions about dosing, potency, administration, or other skill topics. The skill content will guide your detailed responses.",
  args: z.object({
    skillName: z
      .string()
      .describe("The name of the skill to load (e.g., 'dosing')"),
  }),
  handler: async (_ctx, args): Promise<string> => {
    console.log("[TOOL CALL] loadSkill invoked with skillName:", args.skillName);
    const skill = skills[args.skillName];
    if (!skill) {
      console.log("[TOOL CALL] loadSkill - skill not found:", args.skillName);
      return `Skill "${args.skillName}" not found. Available skills: ${Object.keys(skills).join(", ")}`;
    }
    console.log(
      "[TOOL CALL] loadSkill - loaded skill:",
      args.skillName,
      "length:",
      skill.content.length
    );
    return skill.content;
  },
});

const saveNote = createTool({
  description:
    "Save or update your notes about this user. Use this to remember family details, children's names and ages, active cases, remedy history, preferences, and anything that helps you give better care across conversations. Each call replaces the full note, so include all prior content plus updates.",
  args: z.object({
    content: z
      .string()
      .describe(
        "The complete note content. Include everything worth remembering — family info, active cases, past remedies, preferences. This replaces the previous note entirely."
      ),
  }),
  handler: async (ctx, args): Promise<string> => {
    console.log("[TOOL CALL] saveNote invoked, content length:", args.content.length);
    const userId = ctx.userId;
    if (!userId) {
      console.log("[TOOL CALL] saveNote - no userId available");
      return "Could not save note: no user context available.";
    }
    await ctx.runMutation(internal.notes.upsert, {
      userId,
      content: args.content,
    });
    console.log("[TOOL CALL] saveNote - saved for userId:", userId);
    return "Note saved successfully.";
  },
});

const getNotes = createTool({
  description:
    "Retrieve your saved notes about this user. Call this at the start of a conversation to remember who they are, their family, active cases, and past interactions. If no notes exist, you'll get an empty result.",
  args: z.object({}),
  handler: async (ctx): Promise<string> => {
    console.log("[TOOL CALL] getNotes invoked");
    const userId = ctx.userId;
    if (!userId) {
      console.log("[TOOL CALL] getNotes - no userId available");
      return "No user context available.";
    }
    const note = await ctx.runQuery(internal.notes.getByUserId, { userId });
    if (!note) {
      console.log("[TOOL CALL] getNotes - no notes found for userId:", userId);
      return "No notes saved for this user yet.";
    }
    console.log("[TOOL CALL] getNotes - found note, length:", note.content.length);
    return note.content;
  },
});

const tools = { searchMateriaMedica, getLearnMoreLink, loadSkill, saveNote, getNotes };

export const homeopathicAgent = new Agent(components.agent, {
  name: "Homeopathic Assistant",
  languageModel: openrouter.chat("anthropic/claude-sonnet-4.5"),
  instructions: baseMasterPrompt + buildSkillsCatalog(),
  maxSteps: 20,
  tools,
  usageHandler: async (_ctx, { userId, threadId, agentName, usage, model, provider }) => {
    console.log("[USAGE]", JSON.stringify({
      userId,
      threadId,
      agentName,
      model,
      provider,
      ...(usage as any),
    }));
  },
});
