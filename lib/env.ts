const isDev = __DEV__;

export const CONVEX_DEPLOYMENT = isDev ? 'dev:abundant-bandicoot-147' : 'prod:avid-toad-683';

export const EXPO_PUBLIC_CONVEX_URL = isDev ? 'https://abundant-bandicoot-147.convex.cloud' : 'https://avid-toad-683.convex.cloud';

export const EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = isDev ? 'pk_test_cHJvLXR1cmtleS02LmNsZXJrLmFjY291bnRzLmRldiQ' : 'pk_live_Y2xlcmsubXltYXRlcmlhLmFwcCQ';

// export const CLERK_JWT_ISSUER_DOMAIN = isDev ? 'https://pro-turkey-6.clerk.accounts.dev' : 'https://clerk.mymateria.app';

export const EXPO_PUBLIC_REVENUECAT_IOS_KEY = isDev ? 'test_obVyjOiqZssaWBxasxuHcJmPjKg' : 'appl_WolnANIJoYtoDiSDOFkmTZuJpsM';
export const EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = isDev ? 'test_obVyjOiqZssaWBxasxuHcJmPjKg' : null;

export const EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID = isDev ? 'entlee9b3be026' : 'entlee9b3be026';

export const EXPO_PUBLIC_MIXPANEL_TOKEN = isDev ? null : '6037d2f23f573005cb6f760a73dbbb0b';