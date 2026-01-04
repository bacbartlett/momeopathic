import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Message } from '@/types/chat';
import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isLoading = !isUser && (message.status === 'pending' || message.status === 'streaming');
  const hasContent = message.content && message.content.trim().length > 0;

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
          {isLoading && !hasContent ? (
            <TypingIndicator />
          ) : (
            <>
              {hasContent && (
                <Markdown
                  style={isUser ? markdownStyles.user : markdownStyles.assistant}
                >
                  {message.content}
                </Markdown>
              )}
              {isLoading && hasContent && (
                <View style={styles.loadingIndicatorContainer}>
                  <TypingIndicator />
                </View>
              )}
            </>
          )}
        </View>
        {!isLoading && (
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
            {formatTime(message.timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      createAnimation(dot1, 0),
      createAnimation(dot2, 150),
      createAnimation(dot3, 300),
    ];

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [dot1, dot2, dot3]);

  const translateY1 = dot1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const translateY2 = dot2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const translateY3 = dot3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const opacity1 = dot1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const opacity2 = dot2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const opacity3 = dot3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <View style={styles.typingContainer}>
      <Animated.View
        style={[
          styles.typingDot,
          {
            transform: [{ translateY: translateY1 }],
            opacity: opacity1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.typingDot,
          {
            transform: [{ translateY: translateY2 }],
            opacity: opacity2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.typingDot,
          {
            transform: [{ translateY: translateY3 }],
            opacity: opacity3,
          },
        ]}
      />
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
  loadingIndicatorContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.textSecondary,
  },
});

// Markdown styles that match the theme
const markdownStyles = {
  user: {
    body: {
      fontFamily: Fonts?.body ?? 'System',
      fontSize: Typography.base,
      lineHeight: Typography.base * Typography.relaxed,
      color: Colors.textInverse,
      margin: 0,
      padding: 0,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: Spacing.sm,
      color: Colors.textInverse,
    },
    heading1: {
      fontFamily: Fonts?.heading ?? 'System',
      fontSize: Typography.xl,
      fontWeight: Typography.semibold,
      color: Colors.textInverse,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    heading2: {
      fontFamily: Fonts?.heading ?? 'System',
      fontSize: Typography.lg,
      fontWeight: Typography.semibold,
      color: Colors.textInverse,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    heading3: {
      fontFamily: Fonts?.heading ?? 'System',
      fontSize: Typography.base,
      fontWeight: Typography.semibold,
      color: Colors.textInverse,
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    strong: {
      fontWeight: Typography.bold,
      color: Colors.textInverse,
    },
    em: {
      fontStyle: 'italic',
      color: Colors.textInverse,
    },
    link: {
      color: Colors.textInverse,
      textDecorationLine: 'underline',
      opacity: 0.9,
    },
    listItem: {
      color: Colors.textInverse,
      marginBottom: Spacing.xs,
    },
    bullet_list: {
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    ordered_list: {
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    code_inline: {
      fontFamily: Fonts?.mono ?? 'monospace',
      fontSize: Typography.sm,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      color: Colors.textInverse,
      paddingHorizontal: Spacing.xs,
      paddingVertical: 2,
      borderRadius: Radius.sm,
    },
    fence: {
      fontFamily: Fonts?.mono ?? 'monospace',
      fontSize: Typography.sm,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      color: Colors.textInverse,
      padding: Spacing.md,
      borderRadius: Radius.md,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: 'rgba(255, 255, 255, 0.5)',
      paddingLeft: Spacing.md,
      marginLeft: 0,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
      color: Colors.textInverse,
      opacity: 0.9,
    },
    hr: {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      height: 1,
      marginTop: Spacing.md,
      marginBottom: Spacing.md,
    },
  },
  assistant: {
    body: {
      fontFamily: Fonts?.body ?? 'System',
      fontSize: Typography.base,
      lineHeight: Typography.base * Typography.relaxed,
      color: Colors.textPrimary,
      margin: 0,
      padding: 0,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: Spacing.sm,
      color: Colors.textPrimary,
    },
    heading1: {
      fontFamily: Fonts?.heading ?? 'System',
      fontSize: Typography.xl,
      fontWeight: Typography.semibold,
      color: Colors.textPrimary,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    heading2: {
      fontFamily: Fonts?.heading ?? 'System',
      fontSize: Typography.lg,
      fontWeight: Typography.semibold,
      color: Colors.textPrimary,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    heading3: {
      fontFamily: Fonts?.heading ?? 'System',
      fontSize: Typography.base,
      fontWeight: Typography.semibold,
      color: Colors.textPrimary,
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    strong: {
      fontWeight: Typography.bold,
      color: Colors.textPrimary,
    },
    em: {
      fontStyle: 'italic',
      color: Colors.textPrimary,
    },
    link: {
      color: Colors.primary,
      textDecorationLine: 'underline',
    },
    listItem: {
      color: Colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    bullet_list: {
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    ordered_list: {
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    code_inline: {
      fontFamily: Fonts?.mono ?? 'monospace',
      fontSize: Typography.sm,
      backgroundColor: Colors.bgSecondary,
      color: Colors.textPrimary,
      paddingHorizontal: Spacing.xs,
      paddingVertical: 2,
      borderRadius: Radius.sm,
    },
    fence: {
      fontFamily: Fonts?.mono ?? 'monospace',
      fontSize: Typography.sm,
      backgroundColor: Colors.bgSecondary,
      color: Colors.textPrimary,
      padding: Spacing.md,
      borderRadius: Radius.md,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: Colors.primary,
      paddingLeft: Spacing.md,
      marginLeft: 0,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
      color: Colors.textSecondary,
    },
    hr: {
      backgroundColor: Colors.border,
      height: 1,
      marginTop: Spacing.md,
      marginBottom: Spacing.md,
    },
  },
};
