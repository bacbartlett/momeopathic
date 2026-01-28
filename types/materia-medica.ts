/**
 * Types for the Materia Medica feature
 */

/**
 * Raw remedy data from the JSON files
 */
export interface RemedyData {
  name: string;
  body: string;
}

/**
 * Remedy record from the SQLite database
 */
export interface RemedyRecord {
  id: number;
  remedy_name: string;
  body_text: string;
  created_at: number;
}

/**
 * Search result from FTS5 query
 */
export interface RemedySearchResult {
  id: number;
  remedy_name: string;
  body_text: string;
  rank?: number;
}

/**
 * Parsed section from remedy body text
 */
export interface RemedySection {
  title: string;
  content: string;
}

/**
 * Parsed remedy with sections extracted
 */
export interface ParsedRemedy {
  name: string;
  introduction: string;
  sections: RemedySection[];
}
