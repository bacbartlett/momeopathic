import { ChatColors, Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { Message } from '@/types/chat';
import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { MessageBubble } from './message-bubble';

interface MessageListProps {
  messages: Message[];
}

export interface MessageListHandle {
  scrollToBottom: (animated?: boolean) => void;
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList({ messages }, ref) {
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
