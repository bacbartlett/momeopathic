import { ChatColors, Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { Message } from '@/types/chat';
import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import { MessageBubble } from './message-bubble';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
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

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList({ messages, isLoading = false }, ref) {
  const flatListRef = useRef<FlatList<Message>>(null);

  useImperativeHandle(ref, () => ({
    scrollToBottom: (animated = true) => {
      if (messages.length > 0 && flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated });
      }
    },
  }));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

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

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MessageBubble message={item} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }}
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
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
