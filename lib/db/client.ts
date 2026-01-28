/**
 * SQLite database client singleton for Materia Medica
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'materia_medica.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the database instance
 * Uses the synchronous API for better React Native integration
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
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
