import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_STORAGE_KEY = 'revenuecat_logs';
const MAX_LOGS = 1000; // Maximum number of logs to keep

export interface RevenueCatLogEntry {
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

/**
 * Helper function to log and store RevenueCat logs
 * This replaces console.log/error/warn/info calls for RevenueCat
 */
export function logRevenueCat(
  level: RevenueCatLogEntry['level'],
  message: string,
  ...args: unknown[]
): void {
  // Log to console first
  const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'info' ? console.info : console.log;
  consoleMethod(`[RevenueCat] ${message}`, ...args);

  // Store in AsyncStorage (non-blocking)
  const data = args.length > 0 ? (args.length === 1 ? args[0] : args) : undefined;
  addRevenueCatLog(level, message, data).catch(() => {
    // Silently fail - we don't want log storage to break the app
  });
}

/**
 * Add a log entry to storage
 */
export async function addRevenueCatLog(
  level: RevenueCatLogEntry['level'],
  message: string,
  data?: unknown
): Promise<void> {
  try {
    const entry: RevenueCatLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Deep clone to avoid circular references
    };

    const existingLogs = await getRevenueCatLogs();
    const updatedLogs = [entry, ...existingLogs].slice(0, MAX_LOGS); // Keep only the most recent logs

    await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updatedLogs));
  } catch (error) {
    // Silently fail - we don't want log storage to break the app
    console.error('Failed to store RevenueCat log:', error);
  }
}

/**
 * Get all stored logs
 */
export async function getRevenueCatLogs(): Promise<RevenueCatLogEntry[]> {
  try {
    const data = await AsyncStorage.getItem(LOG_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as RevenueCatLogEntry[];
    }
    return [];
  } catch (error) {
    console.error('Failed to retrieve RevenueCat logs:', error);
    return [];
  }
}

/**
 * Clear all stored logs
 */
export async function clearRevenueCatLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOG_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear RevenueCat logs:', error);
  }
}

/**
 * Get logs formatted as a string for display
 */
export async function getRevenueCatLogsAsString(): Promise<string> {
  const logs = await getRevenueCatLogs();
  return logs
    .map((log) => {
      const date = new Date(log.timestamp).toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      const dataStr = log.data ? `\n  Data: ${JSON.stringify(log.data, null, 2)}` : '';
      return `[${date}] ${level} ${log.message}${dataStr}`;
    })
    .join('\n\n');
}
