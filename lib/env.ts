export const isDev = __DEV__;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

export const CONVEX_DEPLOYMENT = readEnv('CONVEX_DEPLOYMENT');

export const EXPO_PUBLIC_CONVEX_URL = requireEnv('EXPO_PUBLIC_CONVEX_URL');
export const EXPO_PUBLIC_POSTHOG_API_KEY = readEnv('EXPO_PUBLIC_POSTHOG_API_KEY') ?? 'YOUR_POSTHOG_API_KEY';
export const EXPO_PUBLIC_POSTHOG_HOST = readEnv('EXPO_PUBLIC_POSTHOG_HOST') ?? 'https://us.i.posthog.com';
