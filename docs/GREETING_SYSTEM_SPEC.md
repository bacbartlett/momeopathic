# Greeting System Specification

## Overview

The Acute Care App uses a tiered greeting system to welcome users based on how long they've been away. The system should feel warm and personal, like a friend remembering you.

## User Scenarios

### 1. Brand New User (First Launch)
- **Trigger:** No thread exists for this user
- **Expected behavior:** Create thread, show welcome greeting immediately
- **Greeting tier:** `new_user`
- **UI:** Greeting appears as first assistant message, no divider needed

### 2. Returning User (< 4 hours)
- **Trigger:** Thread exists, last activity < 4 hours ago
- **Expected behavior:** Resume conversation normally
- **Greeting tier:** None
- **UI:** Show existing messages, no special treatment

### 3. Returning User (4+ hours)
- **Trigger:** Thread exists, last activity 4-24 hours ago
- **Expected behavior:** Show new greeting, hide old messages behind pull-to-reveal
- **Greeting tier:** `4hour`
- **UI:** 
  - Only the NEW greeting is visible
  - Old messages are hidden
  - Banner: "Pull down to see previous messages"
  - User can pull down to reveal old conversation

### 4. Returning User (24+ hours)
- **Trigger:** Thread exists, last activity 24+ hours ago
- **Expected behavior:** Same as 4+ hours but with different greeting text
- **Greeting tier:** `24hour` or `7day` depending on gap
- **UI:** Same pull-to-reveal behavior

## Architecture

### Backend (Convex)

#### `convex/greetings.ts`
- `getGreetingForThread(userId)` - Query that determines which greeting to show
  - Calculates time gap since last message
  - Returns cached greeting if available, otherwise generates new one
  - Returns `{ text: string, tier: string, showDivider: boolean }` or `null`

#### `convex/threads.ts`
- `getOrCreate` - Action called on app launch
  - If no thread exists: creates one, returns `{ threadId, isNew: true, greeting: "...", showDivider: false }`
  - If thread exists: fetches greeting info, returns `{ threadId, isNew: false, greeting: "..." | null, showDivider: boolean }`

#### `convex/greetingCache` table
- Stores pre-generated greetings by tier
- Fields: `userId`, `tier`, `text`, `createdAt`

### Frontend (React Native)

#### `context/chat-context.tsx`
**State:**
- `pendingGreeting: string | null` - The greeting text to display
- `showDivider: boolean` - Whether there's a 4h+ gap (triggers pull-to-reveal)
- `threadInitialized: boolean` - Prevents multiple getOrCreate calls

**Flow:**
```
App Launch
    ↓
ChatProvider mounts
    ↓
useEffect calls getOrCreate action
    ↓
Action returns { threadId, greeting, showDivider }
    ↓
If greeting exists:
  - setPendingGreeting(greeting)
  - setShowDivider(showDivider)
    ↓
Values passed to MessageList via props
```

#### `components/chat/message-list.tsx`
**Props:**
- `messages: Message[]` - Existing messages from DB
- `pendingGreeting: string | null` - New greeting to show
- `showDivider: boolean` - Whether to use pull-to-reveal mode
- `onGreetingDisplayed: () => void` - Callback when greeting shown

**State:**
- `oldMessagesRevealed: boolean` - Whether user has pulled to reveal old messages

**Key Logic:**
```typescript
// Activate pull-to-reveal when: 4h+ gap AND old messages exist
const shouldUsePullToReveal = showDivider && messages.length > 0 && !oldMessagesRevealed;

// In listItems useMemo:
if (shouldUsePullToReveal) {
  if (pendingGreeting) {
    // Show ONLY the greeting (hide old messages)
    return [{ type: 'message', message: greetingAsMessage }];
  }
  // Fallback if no greeting
  if (newestMessage) {
    return [{ type: 'message', message: newestMessage }];
  }
}
// Otherwise show all messages normally
```

## Current Bug

### Symptom
When returning after 4+ hours:
- Debug panel shows `pendingGreeting: null` even though greetings exist in cache
- `showDivider` state not being set correctly
- Old messages remain visible instead of being hidden

### Suspected Issues

1. **Backend → Frontend data flow:**
   - `getOrCreate` action calls `getGreetingForThread` query
   - The greeting may not be reaching the frontend response
   - Check Convex dashboard logs for `getOrCreate` output

2. **Frontend state not being set:**
   - Even if backend returns greeting, `setPendingGreeting()` may not be called
   - Logging exists at lines ~200-210 in chat-context.tsx
   - Check: `[chat-context] result.greeting:` log output

3. **Timing issue:**
   - Actions and queries in Convex are NOT transactional
   - `getGreetingForThread` is a query called within `getOrCreate` action
   - If the query runs before a mutation commits, it may see stale data

### Debug Tools

**Debug Panel (Account screen):**
- Shows: threadId, message count, pendingGreeting, showDivider
- Tier simulation buttons: 30min, 4hour, 24hour, 7day
- Raw messages viewer

**Convex Dashboard:**
- Check `getOrCreate` action logs
- Check `getGreetingForThread` query logs
- Check `greetingCache` table contents

## Expected Test Flow

1. User opens app (fresh or returning)
2. `getOrCreate` is called
3. If 4h+ gap:
   - Backend returns `{ greeting: "Welcome back...", showDivider: true }`
   - Frontend sets `pendingGreeting` and `showDivider`
   - MessageList enters pull-to-reveal mode
   - ONLY the greeting is visible
   - Old messages hidden behind pull gesture
4. User pulls down to reveal old messages
5. `oldMessagesRevealed` becomes true
6. All messages now visible with time divider

## Files to Check

| File | Purpose |
|------|---------|
| `convex/threads.ts` | `getOrCreate` action - entry point |
| `convex/greetings.ts` | `getGreetingForThread` query - greeting logic |
| `context/chat-context.tsx` | Frontend state management |
| `components/chat/message-list.tsx` | UI rendering logic |
| `app/account.tsx` | Debug panel |
| `convex/debug.ts` | Debug utilities |

## Logging Added

**Backend (`convex/greetings.ts`):**
```
[getGreetingForThread] userId=X, gap=Y minutes
[getGreetingForThread] validCached=N, bestCached=tier
[getGreetingForThread] returning { text, tier, showDivider }
```

**Backend (`convex/threads.ts`):**
```
[getOrCreate] Existing thread, greetingInfo: {...}
```

**Frontend (`chat-context.tsx`):**
```
[chat-context] getOrCreate result: {...}
[chat-context] result.greeting: X
[chat-context] Setting pendingGreeting to: X
```
