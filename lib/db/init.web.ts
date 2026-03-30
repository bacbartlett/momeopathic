/**
 * Web stub for database initialization.
 *
 * On web, SQLite is not available so we skip initialization entirely.
 * The Materia Medica hooks will use the JSON fallback automatically.
 *
 * This file is automatically resolved instead of init.ts on web builds
 * thanks to the .web.ts extension.
 */

export interface InitializationResult {
  success: boolean;
  isNewInstall: boolean;
  error?: string;
}

/**
 * No-op on web — SQLite initialization is skipped.
 * The JSON fallback in web-fallback.ts handles materia medica data.
 */
export async function initializeDatabase(): Promise<InitializationResult> {
  console.log('[MateriaMedica] Web platform detected, skipping SQLite init (using JSON fallback)');
  return {
    success: true,
    isNewInstall: false,
  };
}

/**
 * No-op on web.
 */
export async function resetDatabase(): Promise<void> {
  // No-op
}
