/**
 * JSON-based fallback for Materia Medica on web.
 *
 * When SQLite (OPFS) is not available in the browser, this module provides
 * the same query interface using the already-bundled JSON remedy data
 * with simple Array.filter() / String.includes() search.
 */

import { MATERIA_MEDICA } from '@/assets/materia-medica';
import type { RemedyRecord, RemedySearchResult } from '@/types/materia-medica';

// Build an in-memory array that matches the SQLite RemedyRecord shape
let _remedies: RemedyRecord[] | null = null;

function getRemedies(): RemedyRecord[] {
  if (_remedies) return _remedies;

  _remedies = MATERIA_MEDICA.map((r, index) => ({
    id: index + 1,
    remedy_name: r.name,
    body_text: r.body,
    created_at: 0,
  })).sort((a, b) => a.remedy_name.localeCompare(b.remedy_name));

  return _remedies;
}

/**
 * Get all remedies sorted alphabetically by name
 */
export function getAllRemedies(): RemedyRecord[] {
  return getRemedies();
}

/**
 * Search remedies using simple text matching (fallback for FTS5)
 */
export function searchRemedies(query: string, limit = 50): RemedySearchResult[] {
  if (!query.trim()) return [];

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) return [];

  const remedies = getRemedies();

  // Score each remedy: name matches are weighted higher
  const scored = remedies
    .map((r) => {
      const nameLower = r.remedy_name.toLowerCase();
      const bodyLower = r.body_text.toLowerCase();

      let score = 0;
      let allMatch = true;

      for (const term of terms) {
        const nameMatch = nameLower.includes(term);
        const bodyMatch = bodyLower.includes(term);

        if (!nameMatch && !bodyMatch) {
          allMatch = false;
          break;
        }

        // Name matches are worth more
        if (nameMatch) score += 10;
        if (bodyMatch) score += 1;
      }

      return { remedy: r, score, allMatch };
    })
    .filter((s) => s.allMatch && s.score > 0);

  // Sort by score descending, then by name
  scored.sort((a, b) => b.score - a.score || a.remedy.remedy_name.localeCompare(b.remedy.remedy_name));

  return scored.slice(0, limit).map((s) => ({
    id: s.remedy.id,
    remedy_name: s.remedy.remedy_name,
    body_text: s.remedy.body_text,
    rank: -s.score, // Negative to match FTS5 convention (lower = better)
  }));
}

/**
 * Get a single remedy by name
 */
export function getRemedyByName(name: string): RemedyRecord | null {
  if (!name.trim()) return null;
  return getRemedies().find((r) => r.remedy_name === name) ?? null;
}

/**
 * Get a single remedy by ID
 */
export function getRemedyById(id: number): RemedyRecord | null {
  return getRemedies().find((r) => r.id === id) ?? null;
}

/**
 * Get total count of remedies
 */
export function getRemedyCount(): number {
  return getRemedies().length;
}
