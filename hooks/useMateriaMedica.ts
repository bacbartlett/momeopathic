/**
 * Hooks for accessing Materia Medica data from SQLite
 */

import { getDb } from "@/lib/db/client";
import type {
    ParsedRemedy,
    RemedyRecord,
    RemedySearchResult,
    RemedySection,
} from "@/types/materia-medica";
import { useCallback, useEffect, useState } from "react";

/**
 * Parse the remedy body text into structured sections
 */
export function parseRemedyBody(name: string, bodyText: string): ParsedRemedy {
  // Common section headers in materia medica texts
  const sectionPattern = /([A-Za-z][A-Za-z\s\-&]+)\.--/g;

  const sections: RemedySection[] = [];
  let lastIndex = 0;
  let introduction = "";
  let match: RegExpExecArray | null;

  // Find all section headers
  const matches: Array<{ title: string; start: number; headerEnd: number }> =
    [];

  while ((match = sectionPattern.exec(bodyText)) !== null) {
    matches.push({
      title: match[1].trim(),
      start: match.index,
      headerEnd: match.index + match[0].length,
    });
  }

  // Extract introduction (text before first section)
  if (matches.length > 0) {
    introduction = bodyText.substring(0, matches[0].start).trim();

    // Extract each section's content
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];

      const contentStart = currentMatch.headerEnd;
      const contentEnd = nextMatch ? nextMatch.start : bodyText.length;
      const content = bodyText.substring(contentStart, contentEnd).trim();

      // Only add sections that have actual content
      if (content.length > 0) {
        sections.push({
          title: currentMatch.title,
          content,
        });
      }
    }
  } else {
    // No sections found, treat entire text as introduction
    introduction = bodyText;
  }

  return {
    name,
    introduction,
    sections,
  };
}

/**
 * Hook to manage Materia Medica data access
 */
export function useMateriaMedica() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get all remedies sorted alphabetically by name
   */
  const getAllRemedies = useCallback((): RemedyRecord[] => {
    try {
      const db = getDb();
      const results = db.getAllSync<RemedyRecord>(
        "SELECT id, remedy_name, body_text, created_at FROM materia_medica ORDER BY remedy_name ASC",
      );
      return results;
    } catch (err) {
      console.error("[useMateriaMedica] Error getting all remedies:", err);
      setError(err instanceof Error ? err.message : "Failed to get remedies");
      return [];
    }
  }, []);

  /**
   * Search remedies using FTS5 full-text search
   * @param query Search query string
   * @param limit Maximum number of results (default 50)
   */
  const searchRemedies = useCallback(
    (query: string, limit = 50): RemedySearchResult[] => {
      if (!query.trim()) {
        return [];
      }

      try {
        const db = getDb();

        // Sanitize and prepare the search query for FTS5
        // FTS5 uses different syntax than simple LIKE queries
        const sanitizedQuery = query
          .trim()
          .replace(/['"]/g, "") // Remove quotes
          .split(/\s+/) // Split on whitespace
          .filter((term) => term.length > 0)
          .map((term) => `${term}*`) // Add prefix matching
          .join(" "); // FTS5 implicit AND

        if (!sanitizedQuery) {
          return [];
        }

        // Use FTS5 search with ranking
        const results = db.getAllSync<RemedySearchResult>(
          `SELECT 
          m.id, 
          m.remedy_name, 
          m.body_text,
          bm25(materia_medica_fts) as rank
        FROM materia_medica_fts fts
        JOIN materia_medica m ON fts.rowid = m.id
        WHERE materia_medica_fts MATCH ?
        ORDER BY rank
        LIMIT ?`,
          [sanitizedQuery, limit],
        );

        return results;
      } catch (err) {
        console.error("[useMateriaMedica] Error searching remedies:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        return [];
      }
    },
    [],
  );

  /**
   * Get a single remedy by name
   * @param name Remedy name to look up
   */
  const getRemedyByName = useCallback((name: string): RemedyRecord | null => {
    if (!name.trim()) {
      return null;
    }

    try {
      const db = getDb();
      const result = db.getFirstSync<RemedyRecord>(
        "SELECT id, remedy_name, body_text, created_at FROM materia_medica WHERE remedy_name = ?",
        [name],
      );
      return result ?? null;
    } catch (err) {
      console.error("[useMateriaMedica] Error getting remedy by name:", err);
      setError(err instanceof Error ? err.message : "Failed to get remedy");
      return null;
    }
  }, []);

  /**
   * Get a single remedy by ID
   * @param id Remedy ID to look up
   */
  const getRemedyById = useCallback((id: number): RemedyRecord | null => {
    try {
      const db = getDb();
      const result = db.getFirstSync<RemedyRecord>(
        "SELECT id, remedy_name, body_text, created_at FROM materia_medica WHERE id = ?",
        [id],
      );
      return result ?? null;
    } catch (err) {
      console.error("[useMateriaMedica] Error getting remedy by id:", err);
      setError(err instanceof Error ? err.message : "Failed to get remedy");
      return null;
    }
  }, []);

  /**
   * Get total count of remedies
   */
  const getRemedyCount = useCallback((): number => {
    try {
      const db = getDb();
      const result = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM materia_medica",
      );
      return result?.count ?? 0;
    } catch (err) {
      console.error("[useMateriaMedica] Error getting remedy count:", err);
      return 0;
    }
  }, []);

  return {
    isLoading,
    error,
    getAllRemedies,
    searchRemedies,
    getRemedyByName,
    getRemedyById,
    getRemedyCount,
    parseRemedyBody,
  };
}

/**
 * List item for display - common interface for both full records and search results
 */
export interface RemedyListItem {
  id: number;
  remedy_name: string;
  body_text: string;
}

/**
 * Hook for remedies list with search state management
 */
export function useRemediesList() {
  const { getAllRemedies, searchRemedies, getRemedyCount } = useMateriaMedica();
  const [remedies, setRemedies] = useState<RemedyListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Load all remedies on mount
  useEffect(() => {
    const allRemedies = getAllRemedies();
    setRemedies(allRemedies);
    setTotalCount(getRemedyCount());
  }, [getAllRemedies, getRemedyCount]);

  // Handle search with debouncing handled by the component
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setIsSearching(true);

      try {
        if (query.trim()) {
          const results = searchRemedies(query);
          setRemedies(results);
        } else {
          const allRemedies = getAllRemedies();
          setRemedies(allRemedies);
        }
      } finally {
        setIsSearching(false);
      }
    },
    [searchRemedies, getAllRemedies],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    const allRemedies = getAllRemedies();
    setRemedies(allRemedies);
  }, [getAllRemedies]);

  return {
    remedies,
    searchQuery,
    isSearching,
    totalCount,
    isFiltered: searchQuery.trim().length > 0,
    handleSearch,
    clearSearch,
  };
}
