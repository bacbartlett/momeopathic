/**
 * Database initialization logic for Materia Medica
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MATERIA_MEDICA } from '@/assets/materia-medica';
import { createTables, isDatabaseSeeded, seedDatabase } from './seed';

const DB_VERSION_KEY = '@mymateria:db_version';
const CURRENT_DB_VERSION = '1.0.0';

export interface InitializationResult {
  success: boolean;
  isNewInstall: boolean;
  error?: string;
}

/**
 * Initialize the Materia Medica database
 * - Creates tables if they don't exist
 * - Seeds data on first launch
 * - Handles version migrations
 */
export async function initializeDatabase(): Promise<InitializationResult> {
  try {
    console.log('[MateriaMedica] Starting database initialization...');

    // Check current version
    const storedVersion = await AsyncStorage.getItem(DB_VERSION_KEY);
    const isNewInstall = storedVersion === null;

    console.log(`[MateriaMedica] Stored version: ${storedVersion}, Current version: ${CURRENT_DB_VERSION}`);

    // Always ensure tables exist
    createTables();

    // Check if database needs seeding
    const needsSeeding = !isDatabaseSeeded();

    if (needsSeeding) {
      console.log('[MateriaMedica] Database needs seeding...');
      seedDatabase(MATERIA_MEDICA);
    } else {
      console.log('[MateriaMedica] Database already seeded, skipping...');
    }

    // Update version
    if (storedVersion !== CURRENT_DB_VERSION) {
      await AsyncStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);
      console.log(`[MateriaMedica] Updated version to ${CURRENT_DB_VERSION}`);
    }

    console.log('[MateriaMedica] Database initialization complete');

    return {
      success: true,
      isNewInstall,
    };
  } catch (error) {
    console.error('[MateriaMedica] Database initialization failed:', error);
    return {
      success: false,
      isNewInstall: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reset the database (for development/debugging)
 */
export async function resetDatabase(): Promise<void> {
  await AsyncStorage.removeItem(DB_VERSION_KEY);
  console.log('[MateriaMedica] Database version reset');
}
