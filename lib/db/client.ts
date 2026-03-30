/**
 * SQLite database client singleton for Materia Medica
 *
 * On native: uses expo-sqlite with OPFS.
 * On web: attempts OPFS-backed SQLite; if it fails, callers should use the JSON fallback.
 */

import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DB_NAME = 'materia_medica.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbFailed = false;

/**
 * Check if the SQLite database is available on this platform.
 * Returns false on web if OPFS SQLite failed to initialize.
 */
export function isDbAvailable(): boolean {
  if (dbFailed) return false;
  try {
    getDb();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get or create the database instance.
 * Uses the synchronous API for better React Native integration.
 * Throws if SQLite is not available (e.g. web without OPFS support).
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (dbFailed) throw new Error('SQLite not available on this platform');
  if (!dbInstance) {
    try {
      dbInstance = SQLite.openDatabaseSync(DB_NAME);
    } catch (e) {
      if (Platform.OS === 'web') {
        dbFailed = true;
        console.warn('[MateriaMedica] SQLite not available on web, using JSON fallback');
      }
      throw e;
    }
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.closeSync();
    dbInstance = null;
  }
}
