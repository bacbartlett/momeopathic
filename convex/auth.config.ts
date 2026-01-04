import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      // The domain from your Clerk "convex" JWT template
      // This is your Clerk issuer URL (e.g., https://verb-noun-00.clerk.accounts.dev)
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
