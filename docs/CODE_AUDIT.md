# Code Audit — My Materia

**Date:** 2026-02-09  
**Auditor:** R2

---

## 🔴 Security Issues

### HIGH PRIORITY

#### 1. Debug Endpoints Exposed in Production
**Location:** `convex/debug.ts`

The file header says "Remove before production build" but these endpoints ARE currently public:
- `getRawMessages` — exposes raw message data
- `testGreetingTier` — allows manipulating user activity timestamps  
- `insertDebugMessage` — can inject arbitrary messages into threads
- `checkGreetingState` — exposes internal user state

**Risk:** Potential data exposure, ability to manipulate greeting system.

**Fix:** 
```typescript
// Option 1: Delete the file before production
// Option 2: Gate behind admin check or dev environment
const isDev = process.env.CONVEX_CLOUD_URL?.includes('abundant-bandicoot');
if (!isDev) throw new Error("Debug endpoints disabled in production");
```

---

#### 2. Guest ID Validation is Weak
**Location:** `convex/users.ts:168-171`

```typescript
if (args.guestId.length < 20 || args.guestId.length > 50) {
  throw new Error("Invalid guestId format");
}
```

Only validates length, not format. An attacker could potentially:
- Craft predictable IDs to hijack guest sessions
- Enumerate guest accounts

**Fix:** Validate UUID format or add rate limiting:
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(args.guestId)) {
  throw new Error("Invalid guestId format");
}
```

---

#### 3. No Rate Limiting on AI Endpoints
**Location:** `convex/messages.ts:send`

Users can spam the send endpoint, consuming OpenRouter credits without limit.

**Fix:** Add rate limiting per user:
```typescript
// Check rate limit (e.g., 30 messages per minute)
const recentMessages = await ctx.runQuery(internal.rateLimit.checkUserRate, {
  userId: user._id,
  windowMs: 60000,
  maxRequests: 30,
});
if (recentMessages >= 30) {
  throw new Error("Rate limit exceeded. Please slow down.");
}
```

---

### MEDIUM PRIORITY

#### 4. API Keys in Client-Side Code
**Location:** `lib/env.ts`

Clerk publishable keys and RevenueCat keys are exposed. While these are *technically* meant to be public, the PostHog key and Convex deployment names shouldn't be as easily discoverable.

**Note:** This is acceptable for React Native but worth noting.

---

#### 5. Delete Account Doesn't Cascade to Convex Data
**Location:** `components/delete-account-modal.tsx`

When a user deletes their Clerk account, only Clerk data is deleted. Convex data remains:
- User record
- Threads and messages
- Notes (profile, active cases, history, lessons)
- Greeting cache

**Fix:** Create a `deleteUserData` action in Convex and call it before `user.delete()`:
```typescript
await ctx.runMutation(api.users.deleteAllUserData, {});
await user.delete();
```

---

#### 6. No Input Sanitization for Notes Content
**Location:** `convex/notes.ts`

User profile and case content is stored raw. While XSS isn't a risk in React Native (no innerHTML), malicious markdown or injection could affect future web versions or exports.

**Fix:** Basic sanitization or length limits on note content.

---

## 🟡 UI Issues

### HIGH PRIORITY

#### 1. No Loading State for Thread Initialization
**Location:** `context/chat-context.tsx`

When `getOrCreate` is called, there's no UI feedback during the network call. Users see a blank screen or stale content.

**Fix:** Show a skeleton/spinner while `isCreatingThread` is true.

---

#### 2. Error Messages Not User-Friendly
**Location:** Various

Error messages like "GUEST_LIMIT_REACHED" are shown to users directly.

**Fix:** Map error codes to friendly messages:
```typescript
const friendlyErrors: Record<string, string> = {
  "GUEST_LIMIT_REACHED": "You've reached the free trial limit. Sign up to continue!",
  // ...
};
```

---

### MEDIUM PRIORITY

#### 3. Pull-to-Reveal Threshold May Be Too High
**Location:** `components/chat/message-list.tsx:12`

`PULL_THRESHOLD = 100` pixels is a fairly long pull. Could frustrate users.

**Fix:** Consider reducing to 60-80px or making it progressive.

---

#### 4. Empty State Has Hardcoded Suggestions
**Location:** `components/chat/message-list.tsx:285-300`

The suggestion chips ("What is homeopathy?", "Remedies for fever") are static and not tappable.

**Fix:** Make them interactive:
```typescript
onPress={() => sendMessage("What is homeopathy?")}
```

---

#### 5. Time Divider Shows "Today at 12:00 AM" Format
**Location:** `components/chat/message-list.tsx`

The time format could be friendlier ("Just now", "2 hours ago").

---

## 🟠 Tech Debt

### HIGH PRIORITY

#### 1. 240+ Console.log Statements
Found 240 console.log/console.error calls in the codebase. These:
- Leak information in production
- Impact performance
- Clutter logs

**Fix:** 
- Remove debug logs before production
- Use a proper logging library with log levels
- Create a `logger.ts` utility that's silent in production

---

#### 2. Duplicate User Resolution Logic
**Location:** `convex/threads.ts`, `convex/messages.ts`

The same `resolveUserFromQuery`/`resolveUserFromAction`/`resolveUserFromMutation` functions are duplicated across files.

**Fix:** Extract to a shared `convex/lib/auth.ts` helper.

---

#### 3. Legacy Notes Table Still Present
**Location:** `convex/schema.ts:103-108`

```typescript
// LEGACY - keeping for migration, will deprecate
notes: defineTable({...})
```

This table and related functions should be removed after confirming migration is complete.

---

#### 4. TODO Comments Still Present
**Location:** `lib/env.ts`

```typescript
// TODO: Replace 'YOUR_REVENUECAT_ANDROID_API_KEY'...
// TODO: Replace 'YOUR_POSTHOG_API_KEY'...
```

These should be resolved or removed.

---

### MEDIUM PRIORITY

#### 5. Inconsistent Error Handling
Some functions throw errors, others return nulls, others return empty arrays. No consistent pattern.

**Fix:** Standardize on a Result type or consistent throw patterns.

---

#### 6. No TypeScript Strict Mode
Could enable stricter TypeScript settings to catch more bugs.

---

#### 7. Hook File Naming Inconsistency
Mix of `use-kebab-case.ts` and `useXxx.ts` in the hooks folder.

---

#### 8. Large Component Files
- `app/account.tsx` — 36KB
- `app/terms.tsx` — 22KB  
- `app/privacy.tsx` — 21KB

Consider splitting into smaller components.

---

## ✅ Good Practices Observed

1. **Thread ownership verification** — All thread/message access checks `userId` match
2. **Input length validation** — Message and title lengths are capped
3. **Secure guest ID storage** — Uses `expo-secure-store` for guest IDs
4. **Proper auth flow** — Clerk + Convex integration is solid
5. **No XSS vectors** — No `dangerouslySetInnerHTML` or `eval` usage
6. **Subscription warning** — Delete account modal warns about subscription cancellation

---

## Priority Summary

| Priority | Count | Action |
|----------|-------|--------|
| 🔴 High | 6 | Fix before production |
| 🟡 Medium | 5 | Fix soon |
| 🟠 Tech Debt | 8 | Address over time |

**Top 3 immediate actions:**
1. Remove or protect debug endpoints
2. Add rate limiting to AI endpoints
3. Implement cascade delete for user data
