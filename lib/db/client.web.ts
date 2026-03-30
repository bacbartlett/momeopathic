/**
 * Web stub for SQLite database client.
 *
 * expo-sqlite's WASM module can't be bundled by Metro, so on web we skip
 * SQLite entirely and rely on the JSON fallback in web-fallback.ts.
 *
 * This file is automatically resolved instead of client.ts on web builds
 * thanks to the .web.ts extension.
 */

/**
 * SQLite is never available on web — always returns false.
 */
export function isDbAvailable(): boolean {
  return false;
}

/**
 * Always throws on web. Callers should check isDbAvailable() first.
 */
export function getDb(): never {
  throw new Error('SQLite is not available on web. Use the JSON fallback instead.');
}

/**
 * No-op on web.
 */
export function closeDb(): void {
  // No-op
}
