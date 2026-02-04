# Autoscroll Race Condition - Analysis & Fix

## The Problem

Users are experiencing a soft-lock where the chat gets stuck in an infinite scroll loop, fighting between two different scroll positions. This requires closing the app or opening the sidebar to recover.

## Root Cause Analysis

### Multiple Competing Scroll Triggers

The codebase has **4 different scroll triggers** that can fire simultaneously:

#### 1. Thread Load Scroll (`message-list.tsx` lines 106-137)
When switching threads (`isLoading` goes `true` → `false`):
- Fires `scrollToEnd()` **4 times** with timeouts: 0ms, 50ms, 150ms, 300ms
- Sets `pendingScrollToBottomRef = true` for 300ms
- Intention: Ensure we catch the render and scroll to bottom

#### 2. Content Size Change Scroll (`message-list.tsx` lines 161-168)
When FlatList content height changes:
- If `pendingScrollToBottomRef` is true → calls `scrollToEnd()`
- Intention: Keep scrolling during thread load as content renders

#### 3. New Message Scroll (`message-list.tsx` lines 187-241)
When new message arrives or content grows:
- **User messages**: `scrollToEnd()` after 100ms timeout
- **Assistant messages**: `scrollToOffset(calculatedPosition)` after 100ms timeout
  - Calculates target to keep message top visible
- Intention: Follow new content intelligently

#### 4. Keyboard Scroll (`index.tsx` lines 36-65)
When keyboard appears:
- **Android**: Immediate `scrollToBottom()`
- **iOS**: `scrollToBottom()` after 100ms
- Intention: Keep composer visible when typing

### The Race Condition Sequence

Here's what happens when switching threads:

```
T=0ms:    Thread loads, isLoading becomes false
T=0ms:    Trigger #1 fires scrollToEnd() (1st call)
T=10ms:   Messages start rendering
T=15ms:   Trigger #3 detects new message, schedules scroll for T=115ms
T=20ms:   Content size changes
T=20ms:   Trigger #2 fires scrollToEnd() (pendingScrollToBottomRef=true)
T=50ms:   Trigger #1 fires scrollToEnd() (2nd call)
T=115ms:  Trigger #3 fires scrollToOffset(calculatedPosition)
          ⚠️ CONFLICT: Trigger #3 tries to scroll to calculated position
          ⚠️ But Trigger #1 is still active...
T=150ms:  Trigger #1 fires scrollToEnd() (3rd call)
          ⚠️ CONFLICT: Overrides the position from T=115ms
T=200ms:  Another message chunk arrives (streaming)
T=215ms:  Trigger #3 fires again with new scrollToOffset()
          ⚠️ CONFLICT: Fights with Trigger #1
T=300ms:  Trigger #1 fires scrollToEnd() (4th call)
          ⚠️ CONFLICT: Overrides again
T=300ms:  pendingScrollToBottomRef = false
T=320ms:  Content grows, Trigger #3 fires scrollToOffset()
          ⚠️ SOFT LOCK: Now Trigger #3 and lingering scrolls are fighting
```

### Why It Soft-Locks

1. **Overlapping timeouts**: Multiple 100ms timeouts queue up as messages stream in
2. **Conflicting targets**: Some want `scrollToEnd()`, others want `scrollToOffset(position)`
3. **No coordination**: Each trigger doesn't know about the others
4. **Animation conflicts**: React Native's scroll animations can't be interrupted cleanly
5. **Stale measurements**: `contentHeightRef` might not be current when calculating scroll position

## The Fix Strategy

### Core Principles

1. **Single Source of Truth**: One scroll coordinator manages all scroll decisions
2. **Debouncing**: Prevent rapid-fire scroll commands
3. **Priority System**: Clear rules for which scroll wins
4. **State Machine**: Track scroll state to prevent conflicts
5. **Proper Measurements**: Ensure layout is settled before calculating positions

### Implementation Plan

#### 1. Create Scroll Coordinator
- Single ref to track scroll state and pending requests
- Debounce mechanism (100-150ms)
- Clear the queue when higher priority scroll arrives

#### 2. Scroll Priority Rules
**Highest Priority**: Thread initialization (always scroll to bottom)
**High Priority**: User sends message (always scroll to bottom)
**Medium Priority**: Keyboard appearance (scroll to bottom if near bottom)
**Low Priority**: Assistant message streaming (smart scroll to keep top visible)

#### 3. Replace Multiple Triggers
- Thread load: Single scroll request after layout settles
- User message: Immediate high-priority scroll to bottom
- Assistant message: Debounced smart scroll
- Keyboard: Use existing scroll coordinator

#### 4. Prevent Animation Conflicts
- Cancel pending scroll animations before starting new ones
- Use refs to track animation state
- Clear all timeouts when new scroll request comes in

## Key Changes

### Before (Race Conditions)
```typescript
// Thread load: 4 separate scroll calls
scrollToBottom();
setTimeout(scrollToBottom, 50);
setTimeout(scrollToBottom, 150);
setTimeout(scrollToBottom, 300);

// New message: Separate timeout
setTimeout(() => scrollToEnd(), 100);

// Another message: Another timeout
setTimeout(() => scrollToOffset(pos), 100);
// ⚠️ All these timers interleave and fight!
```

### After (Coordinated)
```typescript
// All scrolls go through coordinator
scheduleScroll({
  type: 'thread-load',
  priority: 'highest',
  target: 'bottom'
});

scheduleScroll({
  type: 'new-message',
  priority: isUserMessage ? 'high' : 'low',
  target: isUserMessage ? 'bottom' : calculateSmartPosition()
});

// Coordinator debounces and only executes highest priority
```

## Testing Strategy

After implementing the fix, test these scenarios:

1. **Thread Switch**: Switch between threads rapidly
   - Should scroll to bottom smoothly without fighting

2. **Fast Streaming**: Send message that triggers long AI response
   - Should scroll smoothly as content appears
   - Should not jump past message top

3. **User Scroll Up**: Scroll up while message is streaming
   - Should stop auto-scrolling
   - Should resume when user scrolls back to bottom

4. **Keyboard**: Open keyboard while at bottom
   - Should stay at bottom
   - Should not fight with other scrolls

5. **Multiple Quick Messages**: Send several messages rapidly
   - Should queue scrolls properly
   - Should not create scroll loop

## Implementation Notes

- Keep existing behavior: iMessage-style scrolling
- Maintain `isAutoScrollEnabled` flag for user scroll detection
- Use `requestAnimationFrame` for timing when possible
- Add logging in debug mode to track scroll decisions
- Consider adding a "scroll lock" escape hatch if bugs remain
