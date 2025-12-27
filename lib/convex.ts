import { ConvexReactClient } from "convex/react";

// Initialize the Convex client with the Expo public URL
// The unsavedChangesWarning is disabled for React Native since it's not applicable
export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!,
  {
    unsavedChangesWarning: false,
  }
);

