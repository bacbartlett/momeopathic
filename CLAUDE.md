# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My Materia is a React Native mobile app (iOS & Android) that provides a homeopathy reference guide powered by Boericke's Materia Medica. The app features an AI-powered chat interface for personalized homeopathic recommendations and a searchable database of remedies and symptoms.

## Common Development Commands

### Starting Development
```bash
# Start both Convex backend and Expo dev server
npm run dev

# Start only Convex backend (in one terminal)
npm run convex

# Start only Expo (in another terminal, if convex already running)
npm start
```

### Platform-Specific Commands
```bash
# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run web version
npm run web
```

### Convex Backend
```bash
# Deploy Convex functions to production
npm run convex:deploy

# Run Convex dev server only
npx convex dev
```

### Code Quality
```bash
# Run ESLint
npm run lint
```

## High-Level Architecture

### Backend: Convex + AI Agent System

The backend uses **Convex** as a real-time database with edge functions. The chat functionality is powered by the **@convex-dev/agent** framework:

- **Agent Architecture**: The `homeopathicAgent` (convex/agents/homeopathic.ts) is a conversational AI that conducts homeopathic case-taking interviews
- **RAG System**: Vector search over Boericke's Materia Medica using @convex-dev/rag (see convex/rag/ directory)
- **Thread Management**: Each chat conversation is a "thread" with messages stored in Convex
- **Authentication Flow**: Clerk → Convex auth → automatic user creation in users table

### Frontend: React Native + Expo Router

- **Expo Router**: File-based routing using the `app/` directory
- **Two Main Sections**:
  - Chat interface (app/(tabs)/index.tsx) - AI-powered homeopathic consultation
  - Materia Medica browser (app/materia-medica/) - Searchable remedy database
- **Local SQLite Database**: The materia medica remedy data is stored locally in SQLite (lib/db/) for offline access and fast searching
- **Dual Database Strategy**:
  - SQLite (local) for materia medica remedies
  - Convex (cloud) for user data, threads, and messages

### Provider Hierarchy

The app uses a deeply nested provider structure (see app/_layout.tsx):
```
ClerkProvider (auth)
  → ConvexProviderWithClerk (database + auth bridge)
    → StoreUserInDatabase (auto-creates user record)
      → MateriaMedicaInitializer (seeds local SQLite on first launch)
        → PostHogProviderWrapper (analytics)
          → RevenueCatProvider (subscriptions/paywall)
            → ChatProvider (chat state management)
```

## Key Convex Patterns (from .cursor/rules/convex_rules.mdc)

### Function Syntax
Always use the new Convex function syntax:
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return "Hello " + args.name;
  },
});
```

### Function Types
- `query` / `internalQuery` - Read-only database access
- `mutation` / `internalMutation` - Write database access
- `action` / `internalAction` - Can call external APIs, no direct db access

**CRITICAL**: Always include `args` and `returns` validators. Use `returns: v.null()` if no return value.

### Authentication Pattern
Every public query/mutation/action must verify user ownership:
```typescript
const identity = await ctx.auth.getUserIdentity();
const user = await ctx.db
  .query("users")
  .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
  .unique();
```

See `threads.ts` for helper functions: `getCurrentUserFromQuery`, `getCurrentUserFromMutation`, `getCurrentUserFromAction`.

### Calling Between Functions
- Use `ctx.runQuery(internal.file.func, args)` to call queries from actions
- Use `ctx.runMutation(internal.file.func, args)` to call mutations from actions
- Use function references from `api` (public) or `internal` (private) objects
- Never pass functions directly - always use references like `api.threads.create`

### Schema Design
- Define schema in `convex/schema.ts`
- System fields `_id` and `_creationTime` are automatic
- Index names should describe all fields: `by_token`, `by_channel_and_author`
- Must query index fields in the same order they're defined

### Query Patterns
- **NEVER** use `.filter()` - define indexes and use `.withIndex()` instead
- Use `.unique()` for single results (throws if multiple matches)
- Use `.take(n)` or `.paginate()` for multiple results
- Order defaults to ascending `_creationTime`, use `.order("desc")` to reverse

## Agent System Details

### The Homeopathic Agent
Located in `convex/agents/homeopathic.ts`:
- Uses OpenAI GPT-4 via @ai-sdk/openai
- Has custom tools: `searchMateriaMedica`, `getLearnMoreLink`
- Follows a structured interview strategy (see master prompt in the file)
- Multi-step tool calling: intermediate steps are cleaned up to prevent text duplication

### Message Flow
1. User sends message via `messages.send` (action)
2. Action validates thread ownership, saves user message
3. Calls `homeopathicAgent.sendMessage()` which streams AI response
4. AI may call tools (searchMateriaMedica) during response generation
5. Final response saved as assistant message
6. Intermediate tool-calling messages have their text cleared to prevent duplication

### Thread Lifecycle
- Created via `threads.create` (action) - automatically adds greeting message
- Auto-cleanup: keeps only the most recent empty thread per user
- Title generation: automatic title created after first user message using `titleGenerator` agent

## Local Database (SQLite)

The materia medica remedy data is stored in SQLite for offline access:
- **Initialization**: `lib/db/init.ts` - creates tables and seeds on first launch
- **Seeding**: `lib/db/seed.ts` - populates from `assets/materia-medica/`
- **Client**: `lib/db/client.ts` - provides access to the SQLite database
- Data includes remedy names, symptoms, and full text content from Boericke's Materia Medica

## Third-Party Services

- **Clerk**: Authentication (expo-secure-store for token caching)
- **Convex**: Backend database + serverless functions
- **RevenueCat**: Subscription management and paywall
- **PostHog**: Analytics and session replay
- **OpenAI**: AI model for chat agent (via @ai-sdk/openai)

## Accessibility

### Dynamic Type / Font Scaling

The app **fully supports** user accessibility font size settings:

- **Typography object** (`constants/theme.ts`): Font sizes automatically scale based on `PixelRatio.getFontScale()`
- **Maximum scale**: Capped at 2.0x to prevent extreme layouts that break the UI
- **How it works**: Font sizes use getters that compute scaled values dynamically
- **Hook available**: `useScaledFontSize()` in `hooks/useScaledFontSize.ts` for components that need explicit scaling

Example:
- User sets system font to 150% (1.5x)
- `Typography.base` (normally 16px) returns 24px
- All text using `fontSize: Typography.base` automatically scales

This ensures users with vision impairments can read the app comfortably.

## Chat Autoscroll System

### Inverted FlatList Pattern (Current - 2026-02-03)

The chat uses React Native's **inverted FlatList with maintainVisibleContentPosition** - the industry standard pattern for chat interfaces.

**How It Works:**
- Messages array is reversed to `[newest, ..., oldest]` before rendering
- FlatList is inverted, so index 0 renders at bottom
- Result: Newest messages appear at bottom of screen (like iMessage)
- React Native automatically handles scroll position and new message behavior

**Key Benefits:**
- ✅ No race conditions (platform handles scrolling)
- ✅ Automatic scroll position maintenance when new messages arrive
- ✅ Auto-scrolls to bottom when user is viewing latest messages
- ✅ Maintains position when user scrolls up to read history
- ✅ 60% less code than manual scroll coordination

**Implementation:**
```typescript
const reversedMessages = [...messages].reverse();

<FlatList
  data={reversedMessages}
  inverted
  maintainVisibleContentPosition={{
    minIndexForVisible: 0,
    autoscrollToTopThreshold: 10,
  }}
/>
```

**Thread Switching:**
- Single scroll to bottom on thread load (100ms delay for layout)
- Uses `scrollToOffset({ offset: 0 })` (offset 0 = bottom for inverted list)

**See Also:**
- `AUTOSCROLL_STATUS.md` - Current implementation details and pending work
- `AUTOSCROLL_FIX_SUMMARY.md` - Original race condition fix attempt
- `AUTOSCROLL_RACE_CONDITION_FIX.md` - Detailed analysis of the problem

## Important Notes

### Authentication & Session Management

**Session Persistence**:
- `SessionManager` component (`components/session-manager.tsx`) keeps users logged in indefinitely
- Automatically refreshes tokens every 30 minutes to prevent expiration
- Refreshes tokens when app comes to foreground from background
- Token cache uses `expo-secure-store` with `AFTER_FIRST_UNLOCK` to persist across device restarts

**Clerk Dashboard Configuration**:
- See `CLERK_SESSION_CONFIG.md` for required Clerk Dashboard settings
- Must set "Inactive Session Lifetime" and "Maximum Session Lifetime" to never expire (or very long duration)
- Without proper Clerk settings, users will still be logged out periodically

**Authentication Race Conditions**:
- Queries return empty arrays if user not authenticated yet
- `StoreUserInDatabase` component ensures user exists in Convex before queries run
- Client code retries queries once auth is fully initialized

### Paywall System
- `noPaywall` field on user table bypasses subscription checks
- RevenueCat integration in `context/revenue-cat-context`
- Paywall prompts after certain usage thresholds
- **Offer Codes**: Users can redeem promotional codes to get free access
  - Codes managed via Convex Dashboard (internal mutations only)
  - See `OFFER_CODES.md` for full documentation
  - Redemption validates code, sets `noPaywall: true` on user
  - Tracks usage and prevents duplicate redemptions

### Feedback System
- `FeedbackManager` component shows feedback prompts after N thread interactions
- Tracks `feedbackThreadCount`, `feedbackDismissCount`, `feedbackGiven` on user table
- Email feedback sent via Resend API (convex/feedbackEmail.ts)

### Development Environment
- Uses `.env.local` for environment variables
- Expo Constants loads env vars via `lib/env.ts`
- Never commit `.env.local` or any files in `keys/` directory
