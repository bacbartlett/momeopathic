/**
 * Database seeding logic for Materia Medica
 */

import type { RemedyData } from '@/types/materia-medica';
import { getDb } from './client';

/**
 * Create the database tables and FTS5 virtual table
 */
export function createTables(): void {
  const db = getDb();

  // Create main table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS materia_medica (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remedy_name TEXT UNIQUE NOT NULL,
      body_text TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  // Create FTS5 virtual table for full-text search
  db.execSync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS materia_medica_fts 
    USING fts5(
      remedy_name,
      searchable_content,
      content='materia_medica',
      content_rowid='id'
    );
  `);

  // Create trigger to keep FTS in sync on INSERT
  db.execSync(`
    CREATE TRIGGER IF NOT EXISTS materia_medica_ai 
    AFTER INSERT ON materia_medica BEGIN
      INSERT INTO materia_medica_fts(rowid, remedy_name, searchable_content)
      VALUES (new.id, new.remedy_name, new.remedy_name || ' ' || new.body_text);
    END;
  `);

  // Create trigger to keep FTS in sync on DELETE
  db.execSync(`
    CREATE TRIGGER IF NOT EXISTS materia_medica_ad 
    AFTER DELETE ON materia_medica BEGIN
      INSERT INTO materia_medica_fts(materia_medica_fts, rowid, remedy_name, searchable_content)
      VALUES('delete', old.id, old.remedy_name, old.remedy_name || ' ' || old.body_text);
    END;
  `);

  // Create trigger to keep FTS in sync on UPDATE
  db.execSync(`
    CREATE TRIGGER IF NOT EXISTS materia_medica_au 
    AFTER UPDATE ON materia_medica BEGIN
      INSERT INTO materia_medica_fts(materia_medica_fts, rowid, remedy_name, searchable_content)
      VALUES('delete', old.id, old.remedy_name, old.remedy_name || ' ' || old.body_text);
      INSERT INTO materia_medica_fts(rowid, remedy_name, searchable_content)
      VALUES (new.id, new.remedy_name, new.remedy_name || ' ' || new.body_text);
    END;
  `);

  // Create index for faster name lookups
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_materia_medica_name 
    ON materia_medica(remedy_name);
  `);
}

/**
 * Check if the database has been seeded
 */
export function isDatabaseSeeded(): boolean {
  const db = getDb();
  const result = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM materia_medica'
  );
  return (result?.count ?? 0) > 0;
}

/**
 * Seed the database with materia medica data
 * @param remedies Array of remedy data from JSON files
 */
export function seedDatabase(remedies: RemedyData[]): void {
  const db = getDb();

  console.log(`[MateriaMedica] Seeding database with ${remedies.length} remedies...`);

  // Use a transaction for better performance
  db.withTransactionSync(() => {
    const statement = db.prepareSync(
      'INSERT OR IGNORE INTO materia_medica (remedy_name, body_text) VALUES (?, ?)'
    );

    try {
      for (const remedy of remedies) {
        statement.executeSync([remedy.name, remedy.body]);
      }
    } finally {
      statement.finalizeSync();
    }
  });

  console.log('[MateriaMedica] Database seeding complete');
}

/**
 * Clear all data from the database
 * Useful for re-seeding or development
 */
export function clearDatabase(): void {
  const db = getDb();

  db.withTransactionSync(() => {
    db.execSync('DELETE FROM materia_medica');
    // FTS table will be updated via trigger
  });

  console.log('[MateriaMedica] Database cleared');
}
