import { vSearchEntry, vSearchResult } from "@convex-dev/rag";
import type { Infer } from "convex/values";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { rag } from "./rag/mainrag.rag";

// Maximum lengths for RAG content
const MAX_RAG_CONTENT_LENGTH = 51200; // 50KB
const MAX_SEARCH_QUERY_LENGTH = 1000;

export const vSearchRAGTextResult = v.object({
  results: v.array(vSearchResult),
  text: v.string(),
  entries: v.array(vSearchEntry),
  usage: v.object({ tokens: v.number() })
});

export type SearchRAGTextResult = Infer<typeof vSearchRAGTextResult>;

/**
 * Insert RAG text content for a user.
 * Requires authentication.
 * 
 * @param userId - The user ID (as string) to associate the RAG content with
 * @param content - The text content to add to RAG
 */
export const insertRAGText = action({
  args: {
    content: v.string(),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Must be logged in to insert RAG content");
    }

    // Validate content length
    if (args.content.length > MAX_RAG_CONTENT_LENGTH) {
      throw new Error(`Content too long. Maximum length is ${MAX_RAG_CONTENT_LENGTH} characters.`);
    }
    if (args.content.trim().length === 0) {
      throw new Error("Content cannot be empty.");
    }

    const result = await rag.add(ctx, {
      namespace: args.userId,
      text: args.content
    });

    return result;
  }
});

export const searchRAGText = action({
  args: {
    namespace: v.string(),
    searchFor: v.string()
  },
  returns: vSearchRAGTextResult,
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Must be logged in to search RAG content");
    }

    // Validate search query length
    if (args.searchFor.length > MAX_SEARCH_QUERY_LENGTH) {
      throw new Error(`Search query too long. Maximum length is ${MAX_SEARCH_QUERY_LENGTH} characters.`);
    }
    if (args.searchFor.trim().length === 0) {
      throw new Error("Search query cannot be empty.");
    }

    const result = await rag.search(ctx, {
      namespace: args.namespace,
      query: args.searchFor
    });
    
    return result;
  }
});

const vRAGDocumentItem = v.object({
  name: v.string(),
  body: v.string()
});

/**
 * Insert multiple RAG documents from a JSON object.
 * Requires authentication.
 * 
 * @param jsonInput - A JSON object where the top level is an array.
 *                    Each item in the array should have {name: string, body: string}
 *                    The name will be stored as metadata, and the body will be the document content.
 *                    All documents will be added to the "universal" namespace.
 */
export const insertRAGDocuments = action({
  args: {
    jsonInput: v.union(v.string(), v.array(vRAGDocumentItem))
  },
  returns: v.object({
    success: v.boolean(),
    added: v.number(),
    errors: v.array(v.string())
  }),
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Must be logged in to insert RAG documents");
    }
    const UNIVERSAL_NAMESPACE = "universal";
    const errors: string[] = [];
    let added = 0;

    // Parse JSON if it's a string
    let documents: Array<{ name: string; body: string }>;
    if (typeof args.jsonInput === "string") {
      try {
        const parsed = JSON.parse(args.jsonInput);
        if (!Array.isArray(parsed)) {
          throw new Error("JSON must be an array at the top level");
        }
        documents = parsed;
      } catch (error) {
        throw new Error(`Invalid JSON string: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      documents = args.jsonInput;
    }

    // Validate structure - ensure it's an array
    if (!Array.isArray(documents)) {
      throw new Error("Input must be an array at the top level");
    }

    // Validate each item in the array
    for (let i = 0; i < documents.length; i++) {
      const item = documents[i];
      if (!item || typeof item !== "object") {
        errors.push(`Item at index ${i} is not an object`);
        continue;
      }
      if (typeof item.name !== "string") {
        errors.push(`Item at index ${i} has invalid or missing 'name' field (must be string)`);
        continue;
      }
      if (typeof item.body !== "string") {
        errors.push(`Item at index ${i} has invalid or missing 'body' field (must be string)`);
        continue;
      }
    }

    // Add each valid item to RAG
    for (const item of documents) {
      try {
        // Try adding with metadata - if the API doesn't support it, we'll adjust
        await rag.add(ctx, {
          namespace: UNIVERSAL_NAMESPACE,
          text: item.body,
          metadata: { name: item.name }
        });
        added++;
      } catch (error) {
        errors.push(`Failed to add document "${item.name}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: errors.length === 0,
      added,
      errors
    };
  }
})