# Post-Launch Audit TODO

Issues identified during pre-build audit (2026-03-05). Ordered by priority.

## HIGH

- [ ] **Rate limit offer code redemption** — `convex/offerCodes.ts` has no rate limiting on redemption attempts. Add per-user rate limit (e.g., 1 attempt/min) and lockout after N failures to prevent brute-force code discovery.

- [ ] **Add auth to `searchRAGText`** — `convex/rag.ts:56-80` is a public action with no authentication. Validate that callers can only search the "universal" namespace or their own.

- [ ] **Reduce message rate limit** — `convex/rateLimit.ts` allows 20 msgs/min. Each triggers an AI call via OpenRouter. Consider 5-10/min to limit cost exposure.

- [ ] **Guest user cleanup** — Guest users and their threads accumulate forever. Add a scheduled function to purge guest accounts with no activity for 30+ days.

## MEDIUM — Reliability

- [ ] **Consolidate thread initialization** — `context/chat-context.tsx:192-247` has two competing effects that can set `activeThreadId`. Remove the legacy fallback or merge them into a single init path.

- [ ] **Prevent sendMessage during thread switch** — `context/chat-context.tsx:368-414` captures `activeThreadId` in closure. If user switches threads during a send, message goes to the old thread.

- [ ] **Thread cleanup race** — `convex/threads.ts:281-330` queries for empty threads then deletes them. A message could be sent between query and delete.

- [ ] **Session token double-refresh** — `components/session-manager.tsx` — the 30-min interval and app-foreground listener can both fire simultaneously. Add a simple guard.

- [ ] **Memoize chat context value** — `context/chat-context.tsx:427-451` — context value object is recreated every render. Wrap in `useMemo` to prevent unnecessary consumer re-renders.

## LOW — Code Quality

- [ ] **Replace `Record<string, any>`** in `convex/messages.ts` with proper message types.

- [ ] **Remove unnecessary type casts** — `'/account' as '/account'` in `app/(tabs)/index.tsx:153` and `components/chat/message-bubble.tsx:262`.

- [ ] **Clean up commented-out code** — `convex/threads.ts:367-375`, `components/chat/message-bubble.tsx:236`. Use git history instead.

- [ ] **Add size limits to notes** — `convex/notes.ts` accepts unbounded string content. Add a max length (~50KB).
