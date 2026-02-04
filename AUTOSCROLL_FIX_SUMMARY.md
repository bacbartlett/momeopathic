# Autoscroll Race Condition - Fix Summary

## What Was Fixed

The chat autoscroll had a race condition where multiple scroll triggers would fire simultaneously and fight for control, causing a soft-lock that required closing the app or opening the sidebar.

## Root Cause

**Before the fix**, there were 4 different scroll triggers that could fire at the same time:

1. **Thread Load**: Fired 4 times (0ms, 50ms, 150ms, 300ms)
2. **Content Size Change**: Fired whenever layout changed
3. **New Message**: Fired for each new message or content growth
4. **Keyboard**: Fired when keyboard appeared

These triggers would queue up overlapping `setTimeout` calls that would execute at different times, each trying to scroll to different positions. Some wanted `scrollToEnd()`, others wanted `scrollToOffset(position)`, creating a fighting loop.

## The Solution: Scroll Coordinator

**After the fix**, all scroll requests go through a single coordinator that:

### 1. Priority System
- **Highest Priority**: Thread initialization (always scroll to bottom)
- **High Priority**: User sends message (always scroll to bottom)
- **Low Priority**: Assistant message streaming (smart scroll to keep top visible)

### 2. Debouncing
- All scroll requests are debounced with 100ms delay
- If a new request comes in, it cancels the pending one
- Higher priority requests replace lower priority ones

### 3. Conflict Prevention
- Only one scroll animation can run at a time (`isScrollingRef`)
- New scroll requests wait until current animation completes (300ms)
- All timeouts are properly cleaned up

### 4. Clear State Management
- `threadJustLoadedRef` prevents other scrolls during thread initialization
- `isAutoScrollEnabled` still lets users scroll up to read history
- Layout measurements are properly tracked before calculating scroll positions

## Key Code Changes

### Before (Multiple competing scrolls)
```typescript
// Thread load
scrollToBottom();
setTimeout(scrollToBottom, 50);
setTimeout(scrollToBottom, 150);
setTimeout(scrollToBottom, 300);

// Content size change
if (pending) {
  scrollToEnd();
}

// New message
setTimeout(() => {
  scrollToOffset(position);
}, 100);

// ⚠️ All firing simultaneously, fighting each other
```

### After (Coordinated scrolling)
```typescript
// All requests go through coordinator
scheduleScroll({
  priority: 'highest', // or 'high' or 'low'
  target: 'bottom',    // or 'smart'
  timestamp: Date.now(),
});

// Coordinator debounces and executes only the highest priority
```

## Behavior Preserved

The fix maintains the desired iMessage-style scrolling:

✅ **User sends message** → Instantly scroll to bottom
✅ **Thread switches** → Scroll to bottom after load
✅ **Assistant starts replying** → Scroll to show new message
✅ **Assistant message grows** → Smart scroll (keep top visible, don't jump past it)
✅ **User scrolls up** → Stop auto-scrolling
✅ **User scrolls back to bottom** → Resume auto-scrolling
✅ **Keyboard appears** → Scroll to bottom if near bottom

## Testing Checklist

Please test these scenarios to verify the fix:

### 1. Thread Switching
- [ ] Switch between threads rapidly
- [ ] Should scroll to bottom smoothly without jittering
- [ ] No infinite scroll loops

### 2. Sending Messages
- [ ] Send a message
- [ ] Should immediately scroll to show your message at bottom
- [ ] Should stay at bottom as assistant replies

### 3. Long Assistant Messages
- [ ] Ask a question that triggers a long response
- [ ] Should scroll smoothly as content streams in
- [ ] Should NOT jump past the start of the message
- [ ] Top of the message should stay visible

### 4. User Scroll During Streaming
- [ ] Ask a question, then immediately scroll up while assistant is replying
- [ ] Should stop auto-scrolling
- [ ] Should let you read history without fighting
- [ ] When you scroll back to bottom, should resume auto-scrolling

### 5. Keyboard Behavior
- [ ] Tap the input field to open keyboard
- [ ] Should scroll to keep input visible
- [ ] Should not conflict with message scrolling

### 6. Rapid Message Sending
- [ ] Send several messages quickly (one after another)
- [ ] Should handle all scrolls smoothly
- [ ] Should not create scroll loops

### 7. Sidebar During Streaming
- [ ] Open sidebar while assistant is replying
- [ ] Should not cause scroll issues when closing sidebar

## What to Watch For

If the race condition is truly fixed, you should **never** see:
- ❌ Chat bouncing between two scroll positions
- ❌ Infinite scroll loops
- ❌ Need to close app to recover
- ❌ Need to open sidebar to recover
- ❌ Scroll fighting during message streaming

Instead, scrolling should feel:
- ✅ Smooth and responsive
- ✅ Predictable (always know where it will scroll)
- ✅ Natural (like iMessage)

## Debug Mode (Optional)

If you want to add logging to track scroll decisions, add this at the top of `scheduleScroll()`:

```typescript
console.log('[Scroll Coordinator]', {
  action: 'schedule',
  priority: request.priority,
  target: request.target,
  replacingPending: !!scrollRequestRef.current,
});
```

And in `executeScroll()`:

```typescript
console.log('[Scroll Coordinator]', {
  action: 'execute',
  target: request.target,
  priority: request.priority,
});
```

This will help identify if scrolls are still conflicting.

## Rollback Plan

If this causes issues, the old version is saved in git. You can rollback with:

```bash
git checkout HEAD~1 -- components/chat/message-list.tsx
```

## Technical Details

### Scroll Coordinator Architecture

```
User Action / New Message
         ↓
   scheduleScroll()
         ↓
   [Priority Check]
         ↓
   [Debounce 100ms]
         ↓
   executeScroll()
         ↓
  [Check isScrolling]
         ↓
  [Execute highest priority]
         ↓
  [Mark complete after 300ms]
```

### Priority Resolution

If multiple scroll requests come in:
1. Keep highest priority request
2. Cancel lower priority requests
3. Equal priority → keep newest
4. Wait for current animation to complete

### State Flags

- `scrollRequestRef`: Pending scroll request
- `isScrollingRef`: Whether animation is in progress
- `threadJustLoadedRef`: Suppresses other scrolls during thread init
- `isAutoScrollEnabled`: User preference (disabled when scrolled up)

## Related Files

- `components/chat/message-list.tsx` - Main fix
- `app/(tabs)/index.tsx` - Keyboard scroll handler (unchanged)
- `AUTOSCROLL_RACE_CONDITION_FIX.md` - Detailed analysis
