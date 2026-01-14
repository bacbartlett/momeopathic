export const isDev = __DEV__;

export const CONVEX_DEPLOYMENT = isDev ? 'dev:abundant-bandicoot-147' : 'prod:avid-toad-683';

export const EXPO_PUBLIC_CONVEX_URL = isDev ? 'https://abundant-bandicoot-147.convex.cloud' : 'https://avid-toad-683.convex.cloud';

export const EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = isDev ? 'pk_test_cHJvLXR1cmtleS02LmNsZXJrLmFjY291bnRzLmRldiQ' : 'pk_live_Y2xlcmsubXltYXRlcmlhLmFwcCQ';

// export const CLERK_JWT_ISSUER_DOMAIN = isDev ? 'https://pro-turkey-6.clerk.accounts.dev' : 'https://clerk.mymateria.app';

export const EXPO_PUBLIC_REVENUECAT_IOS_KEY = isDev ? 'test_obVyjOiqZssaWBxasxuHcJmPjKg' : 'appl_WolnANIJoYtoDiSDOFkmTZuJpsM';
// TODO: Replace 'YOUR_REVENUECAT_ANDROID_API_KEY' with your actual production API key from RevenueCat Dashboard
// Go to: RevenueCat Dashboard → Project Settings → API Keys → Google Play public API key
export const EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = isDev ? 'test_obVyjOiqZssaWBxasxuHcJmPjKg' : 'goog_bSiHsKxbXVpuCMpQAQiVjqZRujU';

export const EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID = isDev ? 'Homeopathy Chat Unlimited' : 'Homeopathy Chat Unlimited';

// TODO: Replace 'YOUR_POSTHOG_API_KEY' with your actual PostHog project API key from the PostHog dashboard
export const EXPO_PUBLIC_POSTHOG_API_KEY = isDev ? 'phc_71PdQlY1NaecBD1Kz79ZGrVSO4NskfKOdCzlUGHMyid' : 'phc_71PdQlY1NaecBD1Kz79ZGrVSO4NskfKOdCzlUGHMyid';
export const EXPO_PUBLIC_POSTHOG_HOST = 'https://us.i.posthog.com';