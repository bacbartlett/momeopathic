import { ChatColors, Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { useChat } from '@/context/chat-context';
import { Message } from '@/types/chat';
import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, NativeScrollEvent, NativeSyntheticEvent, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MessageBubble } from './message-bubble';

// 4 hours in milliseconds - threshold for showing time dividers
const TIME_DIVIDER_THRESHOLD_MS = 4 * 60 * 60 * 1000;

// Pull threshold for revealing old messages
const PULL_THRESHOLD = 100;

// Time divider component
function TimeDivider({ timestamp }: { timestamp: number }) {
  const formatDividerDate = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  };

  return (
    <View style={dividerStyles.container}>
      <View style={dividerStyles.line} />
      <View style={dividerStyles.labelContainer}>
        <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
        <Text style={dividerStyles.label}>{formatDividerDate(timestamp)}</Text>
      </View>
      <View style={dividerStyles.line} />
    </View>
  );
}

// Item type for FlatList - either a message or a divider
type ListItem = 
  | { type: 'message'; message: Message }
  | { type: 'divider'; timestamp: number; key: string };

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  forceDivider?: boolean;
}

export interface MessageListHandle {
  scrollToBottom: (animated?: boolean) => void;
}

// Skeleton loader component for messages
function MessageListSkeleton() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={skeletonStyles.container}>
      {/* User message skeleton */}
      <View style={skeletonStyles.userRow}>
        <Animated.View style={[skeletonStyles.userBubble, { opacity }]} />
      </View>

      {/* Assistant message skeleton */}
      <View style={skeletonStyles.assistantRow}>
        <View style={skeletonStyles.avatarSkeleton}>
          <Animated.View style={[skeletonStyles.avatarInner, { opacity }]} />
        </View>
        <View style={skeletonStyles.assistantBubbleWrapper}>
          <Animated.View style={[skeletonStyles.assistantBubble, { opacity }]} />
          <Animated.View style={[skeletonStyles.assistantBubbleLine, { opacity }]} />
        </View>
      </View>

      {/* Another user message skeleton */}
      <View style={skeletonStyles.userRow}>
        <Animated.View style={[skeletonStyles.userBubbleShort, { opacity }]} />
      </View>

      {/* Another assistant message skeleton */}
      <View style={skeletonStyles.assistantRow}>
        <View style={skeletonStyles.avatarSkeleton}>
          <Animated.View style={[skeletonStyles.avatarInner, { opacity }]} />
        </View>
        <View style={skeletonStyles.assistantBubbleWrapper}>
          <Animated.View style={[skeletonStyles.assistantBubbleLong, { opacity }]} />
          <Animated.View style={[skeletonStyles.assistantBubble, { opacity }]} />
          <Animated.View style={[skeletonStyles.assistantBubbleLine, { opacity }]} />
        </View>
      </View>
    </View>
  );
}

/**
 * Pull-to-reveal banner component
 */
function PullToRevealBanner({ pullProgress, isReady }: { pullProgress: Animated.Value; isReady: boolean }) {
  const opacity = pullProgress.interpolate({
    inputRange: [0, 50, PULL_THRESHOLD],
    outputRange: [0.3, 0.7, 1],
    extrapolate: 'clamp',
  });

  const scale = pullProgress.interpolate({
    inputRange: [0, PULL_THRESHOLD],
    outputRange: [0.9, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[pullBannerStyles.container, { opacity, transform: [{ scale }] }]}>
      <Ionicons 
        name={isReady ? "checkmark-circle" : "arrow-down-circle-outline"} 
        size={16} 
        color={isReady ? Colors.primary : Colors.textMuted} 
      />
      <Text style={[pullBannerStyles.text, isReady && pullBannerStyles.textReady]}>
        {isReady ? "Release to load old messages" : "Pull down to see old messages"}
      </Text>
    </Animated.View>
  );
}

/**
 * Best practice for chat scrolling based on React Native community recommendations:
 * - Use inverted FlatList (renders messages bottom-to-top like iMessage/WhatsApp)
 * - Use maintainVisibleContentPosition to prevent scroll jumping
 * - Auto-scroll only when user is at bottom (viewing latest messages)
 */
export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList({ messages, isLoading = false, forceDivider = false }, ref) {
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const { sendError, retryLastMessage, clearSendError } = useChat();
  
  // Pull-to-reveal state for 4h+ gaps
  const [oldMessagesRevealed, setOldMessagesRevealed] = useState(false);
  const pullProgress = useRef(new Animated.Value(0)).current;
  const [isPullReady, setIsPullReady] = useState(false);
  const revealAnimation = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [isAtTop, setIsAtTop] = useState(false);

  const sortedByOldest = useMemo(() => {
    return [...messages].sort((a, b) => a.timestamp - b.timestamp);
  }, [messages]);

  const dividerIndex = useMemo(() => {
    if (sortedByOldest.length < 2) return null;
    let index: number | null = null;
    for (let i = 1; i < sortedByOldest.length; i++) {
      if (sortedByOldest[i].timestamp - sortedByOldest[i - 1].timestamp >= TIME_DIVIDER_THRESHOLD_MS) {
        index = i;
      }
    }
    if (forceDivider) {
      // Debug mode: keep the last two messages as the "new" segment.
      return Math.max(sortedByOldest.length - 2, 1);
    }
    return index;
  }, [sortedByOldest, forceDivider]);

  const showDivider = dividerIndex !== null;
  const oldSegment = dividerIndex !== null ? sortedByOldest.slice(0, dividerIndex) : [];
  const newSegment = dividerIndex !== null ? sortedByOldest.slice(dividerIndex) : sortedByOldest;

  // Determine if we should use pull-to-reveal mode
  // Only when: showDivider is true (4h+ gap), messages exist, and not yet revealed
  // Activate pull-to-reveal when: 4h+ gap, old messages exist, and not yet revealed
  const shouldUsePullToReveal = showDivider && oldSegment.length > 0 && !oldMessagesRevealed;

  // Reset reveal state when thread changes or showDivider changes
  useEffect(() => {
    if (!showDivider) {
      setOldMessagesRevealed(true); // No 4h+ gap, show all messages
    } else {
      setOldMessagesRevealed(false); // 4h+ gap, start hidden
      revealAnimation.setValue(0);
    }
  }, [showDivider]);
  
  // Debug: force divider should always reset reveal state
  useEffect(() => {
    if (forceDivider) {
      setOldMessagesRevealed(false);
      revealAnimation.setValue(0);
    }
  }, [forceDivider, revealAnimation]);

  /**
   * Expose scroll method to parent
   */
  useImperativeHandle(ref, () => ({
    scrollToBottom: (animated = true) => {
      if (messages.length > 0 && flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated });
      }
    },
  }), [messages.length]);

  /**
   * Scroll to bottom when messages first load (thread switch)
   */
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  /**
   * Handle scroll for pull-to-reveal
   */
  const getPullDistance = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    return Math.max(0, Math.abs(contentOffset.y));
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const maxOffset = Math.max(0, contentHeight - layoutHeight);
    const atTop = contentOffset.y >= maxOffset - 8;
    if (atTop !== isAtTop) {
      setIsAtTop(atTop);
    }
    if (!shouldUsePullToReveal || !atTop) {
      pullProgress.setValue(0);
      setIsPullReady(false);
      return;
    }

    const pullDistance = getPullDistance(event);
    
    pullProgress.setValue(pullDistance);
    setIsPullReady(pullDistance >= PULL_THRESHOLD);
  }, [shouldUsePullToReveal, pullProgress, getPullDistance, contentHeight, layoutHeight, isAtTop]);

  /**
   * Handle scroll end - trigger reveal if threshold met
   */
  const handleScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!shouldUsePullToReveal || !isAtTop) return;

    const pullDistance = getPullDistance(event);

    if (pullDistance >= PULL_THRESHOLD) {
      // Trigger reveal animation
      setOldMessagesRevealed(true);
      Animated.spring(revealAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }

    // Reset pull progress
    Animated.timing(pullProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setIsPullReady(false);
  }, [shouldUsePullToReveal, isAtTop, pullProgress, revealAnimation, getPullDistance]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!shouldUsePullToReveal || !isAtTop) return false;
        return Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dx) < 6;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!shouldUsePullToReveal || !isAtTop) return;
        const pullDistance = Math.max(0, Math.abs(gestureState.dy));
        pullProgress.setValue(pullDistance);
        setIsPullReady(pullDistance >= PULL_THRESHOLD);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!shouldUsePullToReveal || !isAtTop) return;
        const pullDistance = Math.max(0, Math.abs(gestureState.dy));
        if (pullDistance >= PULL_THRESHOLD) {
          setOldMessagesRevealed(true);
          Animated.spring(revealAnimation, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
        }
        Animated.timing(pullProgress, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
        setIsPullReady(false);
      },
    });
  }, [shouldUsePullToReveal, isAtTop, pullProgress, revealAnimation]);

  // Build list items - show only the new segment until revealed
  const listItems = useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    
    const visibleMessages = shouldUsePullToReveal ? newSegment : sortedByOldest;
    
    for (let i = 0; i < visibleMessages.length; i++) {
      const msg = visibleMessages[i];
      const prevMsg = i > 0 ? visibleMessages[i - 1] : null;
      
      // Check if we need a divider before this message
      if (prevMsg && msg.timestamp - prevMsg.timestamp >= TIME_DIVIDER_THRESHOLD_MS) {
        items.push({
          type: 'divider',
          timestamp: msg.timestamp,
          key: `divider-${msg.id}`,
        });
      }
      
      items.push({ type: 'message', message: msg });
    }
    
    // Reverse for inverted FlatList (newest first)
    return items.reverse();
  }, [shouldUsePullToReveal, newSegment, sortedByOldest]);

  // Show skeleton while loading messages for a thread switch
  if (isLoading) {
    return <MessageListSkeleton />;
  }

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {/* Decorative illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationCircle}>
            <View style={styles.illustrationInnerCircle}>
              <Ionicons name="leaf" size={48} color={Colors.primary} />
            </View>
          </View>
          {/* Decorative leaves */}
          <View style={[styles.decorativeLeaf, styles.leafTopRight]}>
            <Ionicons name="leaf-outline" size={20} color={Colors.primaryLight} />
          </View>
          <View style={[styles.decorativeLeaf, styles.leafBottomLeft]}>
            <Ionicons name="leaf-outline" size={16} color={Colors.accent} />
          </View>
        </View>

        <Text style={styles.emptyTitle}>Welcome! 👋</Text>
        <Text style={styles.emptySubtitle}>
          I'm here to help you explore homeopathic remedies for your family's wellness. Ask me anything about natural healing!
        </Text>

        {/* Suggestion chips */}
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionChip}>
            <Ionicons name="help-circle-outline" size={14} color={Colors.primary} />
            <Text style={styles.suggestionText}>What is homeopathy?</Text>
          </View>
          <View style={styles.suggestionChip}>
            <Ionicons name="thermometer-outline" size={14} color={Colors.primary} />
            <Text style={styles.suggestionText}>Remedies for fever</Text>
          </View>
          <View style={styles.suggestionChip}>
            <Ionicons name="moon-outline" size={14} color={Colors.primary} />
            <Text style={styles.suggestionText}>Sleep support for kids</Text>
          </View>
        </View>
      </View>
    );
  }

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'divider') {
      return <TimeDivider timestamp={item.timestamp} />;
    }
    return (
      <MessageBubble
        message={item.message}
        onRetry={item.message.status === 'failed' ? retryLastMessage : undefined}
      />
    );
  }, [retryLastMessage]);

  const keyExtractor = useCallback((item: ListItem) => {
    return item.type === 'divider' ? item.key : item.message.id;
  }, []);

  const pullIndicatorHeight = useMemo(() => {
    return pullProgress.interpolate({
      inputRange: [0, PULL_THRESHOLD],
      outputRange: [0, 64],
      extrapolate: 'clamp',
    });
  }, [pullProgress]);

  const pullIndicatorOpacity = useMemo(() => {
    return pullProgress.interpolate({
      inputRange: [0, 20, PULL_THRESHOLD],
      outputRange: [0, 0.6, 1],
      extrapolate: 'clamp',
    });
  }, [pullProgress]);

  return (
    <View style={styles.listWrapper} {...panResponder.panHandlers}>
      {/* Error banner */}
      {sendError && (
        <View style={styles.errorBanner}>
          <View style={styles.errorBannerContent}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {sendError}
            </Text>
          </View>
          <View style={styles.errorBannerActions}>
            <TouchableOpacity
              style={styles.errorRetryButton}
              onPress={retryLastMessage}
              accessibilityLabel="Retry sending message"
              accessibilityRole="button"
            >
              <Text style={styles.errorRetryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.errorDismissButton}
              onPress={clearSendError}
              accessibilityLabel="Dismiss error"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pull-to-reveal indicator (classic pull-to-refresh style) */}
      {shouldUsePullToReveal && (
        <Animated.View
          style={[
            pullIndicatorStyles.container,
            { height: pullIndicatorHeight, opacity: pullIndicatorOpacity },
          ]}
        >
          <View style={pullIndicatorStyles.breakLine} />
          <View style={pullIndicatorStyles.content}>
            <Ionicons
              name={isPullReady ? "checkmark-circle" : "arrow-up-circle-outline"}
              size={18}
              color={isPullReady ? Colors.primary : Colors.textMuted}
            />
            <Text style={[pullIndicatorStyles.text, isPullReady && pullIndicatorStyles.textReady]}>
              {isPullReady ? "Release to load previous messages" : "Pull up to see previous messages"}
            </Text>
          </View>
        </Animated.View>
      )}
      {shouldUsePullToReveal && (
        <View style={pullIndicatorStyles.staticBanner}>
          <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
          <Text style={pullIndicatorStyles.staticText}>Previous messages hidden</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={listItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // CRITICAL: Inverted list for chat (newest at bottom)
        inverted
        // CRITICAL: Prevents scroll jumping when new messages arrive
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        // Pull-to-reveal handlers
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        // Allow overscroll for pull gesture
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
        onContentSizeChange={(_, height) => {
          setContentHeight(height);
          const maxOffset = Math.max(0, height - layoutHeight);
          setIsAtTop(maxOffset === 0);
        }}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          setLayoutHeight(height);
          const maxOffset = Math.max(0, contentHeight - height);
          setIsAtTop(maxOffset === 0);
        }}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(212, 132, 124, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 132, 124, 0.3)',
  },
  errorBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  errorBannerText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.error,
    flex: 1,
  },
  errorBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorRetryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.error,
    borderRadius: Radius.sm,
  },
  errorRetryText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  errorDismissButton: {
    padding: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: ChatColors.background,
  },
  illustrationContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorativeLeaf: {
    position: 'absolute',
    opacity: 0.6,
  },
  leafTopRight: {
    top: -5,
    right: -10,
    transform: [{ rotate: '45deg' }],
  },
  leafBottomLeft: {
    bottom: 5,
    left: -5,
    transform: [{ rotate: '-30deg' }],
  },
  emptyTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * Typography.relaxed,
    marginBottom: Spacing.xl,
    maxWidth: 300,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
});

// Skeleton styles
const skeletonStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: ChatColors.background,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  userBubble: {
    width: '65%',
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryAlpha20,
  },
  userBubbleShort: {
    width: '45%',
    height: 36,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryAlpha20,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  avatarSkeleton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  avatarInner: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha20,
  },
  assistantBubbleWrapper: {
    flex: 1,
    gap: Spacing.xs,
  },
  assistantBubble: {
    width: '75%',
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: Colors.secondary,
  },
  assistantBubbleLong: {
    width: '90%',
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.secondary,
  },
  assistantBubbleLine: {
    width: '50%',
    height: 24,
    borderRadius: Radius.lg,
    backgroundColor: Colors.secondary,
  },
});

// Time divider styles
const dividerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginVertical: Spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});

// Pull-to-reveal banner styles
const pullBannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  text: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  textReady: {
    color: Colors.primary,
    fontWeight: '500',
  },
  staticBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  staticText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});

const pullIndicatorStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
  },
  staticBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  staticText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  breakLine: {
    height: 1,
    backgroundColor: Colors.borderLight,
    opacity: 0.6,
    marginBottom: Spacing.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  text: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  textReady: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
