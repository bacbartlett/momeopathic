import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Message } from '@/types/chat';
import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {/* Avatar for assistant messages */}
      {!isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="leaf" size={16} color={Colors.primary} />
          </View>
        </View>
      )}
      
      <View style={styles.bubbleWrapper}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
            {message.content}
          </Text>
        </View>
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  bubbleWrapper: {
    maxWidth: '80%',
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    ...Shadows.sm,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
    // Subtle gradient effect via shadow
    ...Platform.select({
      ios: Shadows.glow,
      android: { elevation: 4 },
      default: {},
    }),
  },
  assistantBubble: {
    backgroundColor: ChatColors.assistantBubble,
    borderBottomLeftRadius: Radius.sm,
  },
  text: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    lineHeight: Typography.base * Typography.relaxed,
  },
  userText: {
    color: Colors.textInverse,
  },
  assistantText: {
    color: Colors.textPrimary,
  },
  timestamp: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    marginTop: Spacing.xs,
    opacity: 0.7,
  },
  userTimestamp: {
    textAlign: 'right',
    color: Colors.textMuted,
  },
  assistantTimestamp: {
    textAlign: 'left',
    color: Colors.textMuted,
  },
});
