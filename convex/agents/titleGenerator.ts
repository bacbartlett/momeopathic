import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

// Create OpenAI-compatible client pointing to OpenRouter
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/**
 * Generate a short, descriptive title for a conversation based on the user's first message.
 * Uses a fast, lightweight model for quick title generation.
 */
export async function generateConversationTitle(firstUserMessage: string): Promise<string> {
  const result = await generateText({
    model: openrouter.chat("minimax/minimax-m2.1"),
    system: `You are a title generator. Generate a very short, descriptive title (2-5 words max) for a conversation based on the user's first message. 
The title should capture the essence of what the user is asking about.
Do NOT use quotes around the title.
Do NOT include punctuation at the end.
Examples:
- "I have a headache" → "Headache Relief"
- "My child has a fever" → "Child's Fever"
- "I can't sleep at night" → "Sleep Issues"
- "Feeling anxious and stressed" → "Anxiety and Stress"`,
    prompt: firstUserMessage,
  });

  return result.text.trim();
}
