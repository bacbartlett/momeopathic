export const isDev = __DEV__;

// ---------------------------------------------------------------------------
// Convex environment config
//
// These are public frontend values (not secrets) — they just identify which
// Convex deployment to talk to.  Hardcoding them here means the web build
// works on Vercel without any env-var configuration.
// ---------------------------------------------------------------------------

export const CONVEX_DEPLOYMENT = isDev
  ? 'dev:good-clownfish-55'
  : 'prod:zealous-lynx-409';

export const EXPO_PUBLIC_CONVEX_URL = isDev
  ? 'https://good-clownfish-55.convex.cloud'
  : 'https://zealous-lynx-409.convex.cloud';

// ---------------------------------------------------------------------------
// Optional services — still read from env so they can be overridden, but
// fall back to sensible defaults when unset.
// ---------------------------------------------------------------------------

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const EXPO_PUBLIC_POSTHOG_API_KEY = readEnv('EXPO_PUBLIC_POSTHOG_API_KEY') ?? 'YOUR_POSTHOG_API_KEY';
export const EXPO_PUBLIC_POSTHOG_HOST = readEnv('EXPO_PUBLIC_POSTHOG_HOST') ?? 'https://us.i.posthog.com';
