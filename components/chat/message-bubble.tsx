import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Message } from '@/types/chat';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface MessageBubbleProps {
  message: Message;
}

const fixRepeatText = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return text;
  
  const midPoint = Math.floor(trimmed.length / 2);
  
  // Check for exact split in the middle (no separator)
  const firstHalf = trimmed.substring(0, midPoint);
  const secondHalf = trimmed.substring(midPoint);
  if (firstHalf === secondHalf) {
    return firstHalf;
  }
  
  // Check for repetition with whitespace separator
  // Look for a split point where both parts are identical
  // Search around the middle point (±20% of length)
  const searchRange = Math.floor(trimmed.length * 0.2);
  const startSearch = Math.max(1, midPoint - searchRange);
  const endSearch = Math.min(trimmed.length - 1, midPoint + searchRange);
  
  for (let i = startSearch; i <= endSearch; i++) {
    const part1 = trimmed.substring(0, i).trim();
    const part2 = trimmed.substring(i).trim();
    
    // If parts match exactly, return first part
    if (part1 === part2 && part1.length > 0) {
      return part1;
    }
  }
  
  // No exact repetition found, return original text
  return text;
}

const filterBrokenLinks = (text: string): string => {
  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  // Check if there are any links
  const hasLinks = linkRegex.test(text);
  if (!hasLinks) {
    return text;
  }
  
  // Reset regex lastIndex
  linkRegex.lastIndex = 0;
  
  // Find all links and check which are broken
  const matches: Array<{ fullMatch: string; url: string; startIndex: number; endIndex: number }> = [];
  let match;
  
  while ((match = linkRegex.exec(text)) !== null) {
    const url = match[2];
    // Check if URL is valid (basic validation: starts with http:// or https://, or has valid domain structure)
    const isValidUrl = /^https?:\/\/.+/.test(url) || /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(url);
    
    if (!isValidUrl) {
      matches.push({
        fullMatch: match[0],
        url: url,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }
  
  // If no broken links, return original text
  if (matches.length === 0) {
    return text;
  }
  
  // Process broken links from end to start to maintain indices
  let result = text;
  
  // Process each broken link URL
  for (let i = matches.length - 1; i >= 0; i--) {
    const brokenUrl = matches[i].url;
    
    // Find this broken link in the current result string
    // Escape special regex characters in the URL
    const escapedUrl = brokenUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapedUrl}\\)`, 'g');
    
    // Find the last occurrence (since we're processing backwards)
    let linkMatch: RegExpExecArray | null = null;
    let lastMatch: RegExpExecArray | null = null;
    linkPattern.lastIndex = 0;
    
    while ((linkMatch = linkPattern.exec(result)) !== null) {
      lastMatch = linkMatch;
    }
    
    if (!lastMatch) {
      // Link already removed, skip
      continue;
    }
    
    const brokenLinkStart = lastMatch.index;
    const brokenLinkEnd = brokenLinkStart + lastMatch[0].length;
    
    // Check if this broken link is part of the specific "Would you like to know more" section
    const sectionPattern = /Would you like to know more about it\? You can ask me questions or read \[the full Materia Medica entry here\]\([^)]+\)\.?/i;
    const sectionMatch = result.match(sectionPattern);
    
    if (sectionMatch && sectionMatch.index !== undefined && 
        brokenLinkStart >= sectionMatch.index && 
        brokenLinkEnd <= sectionMatch.index + sectionMatch[0].length) {
      // Remove the entire section
      const sectionStart = sectionMatch.index;
      const sectionEnd = sectionStart + sectionMatch[0].length;
      
      // Remove the section, but preserve newlines that precede it
      // Only remove trailing spaces/tabs (not newlines) from beforeSection
      const beforeSection = result.substring(0, sectionStart).replace(/[ \t]+$/, '');
      const afterSection = result.substring(sectionEnd).replace(/^\s+/, '');
      
      // Add a period if the section before ended without punctuation
      const needsPeriod = beforeSection.length > 0 && !/[.!?]$/.test(beforeSection.trim());
      result = beforeSection + (needsPeriod ? '.' : '') + (afterSection ? ' ' + afterSection : '');
    } else {
      // Find the sentence containing the broken link
      const beforeLink = result.substring(0, brokenLinkStart);
      const afterLink = result.substring(brokenLinkEnd);
      
      // Find the start of the sentence (last sentence boundary before the link)
      // Look for the last occurrence of . ! or ? followed by whitespace
      let sentenceStart = 0;
      const lastBoundaryMatch = beforeLink.match(/[.!?]\s+[^.!?]*$/);
      if (lastBoundaryMatch) {
        sentenceStart = beforeLink.lastIndexOf(lastBoundaryMatch[0]) + lastBoundaryMatch[0].length;
      } else {
        // If no boundary found, check if there's whitespace or start of string
        const whitespaceMatch = beforeLink.match(/\s+[^\s]*$/);
        if (whitespaceMatch) {
          const leadingWhitespace = whitespaceMatch[0].match(/^\s+/)?.[0];
          const whitespaceLength = leadingWhitespace ? leadingWhitespace.length : 0;
          sentenceStart = beforeLink.lastIndexOf(whitespaceMatch[0]) + whitespaceMatch[0].length - whitespaceLength;
        }
      }
      
      // Find the end of the sentence (first sentence boundary after the link)
      let sentenceEnd = result.length;
      const firstBoundaryMatch = afterLink.match(/^[^.!?]*[.!?]/);
      if (firstBoundaryMatch) {
        sentenceEnd = brokenLinkEnd + firstBoundaryMatch[0].length;
      } else {
        // If no boundary found, look for end of line or end of string
        const lineEndMatch = afterLink.match(/^[^\n]*\n/);
        if (lineEndMatch) {
          sentenceEnd = brokenLinkEnd + lineEndMatch[0].length;
        }
      }
      
      // Remove the sentence
      const beforeSentence = result.substring(0, sentenceStart).trim();
      const afterSentence = result.substring(sentenceEnd).trim();
      
      // Combine, ensuring proper spacing
      result = beforeSentence + (beforeSentence && afterSentence ? ' ' : '') + afterSentence;
    }
  }
  
  return result.trim();
}

export function MessageBubble({ message }: MessageBubbleProps) {
  console.log(message.content)
  const isUser = message.role === 'user';
  const isLoading = !isUser && (message.status === 'pending' || message.status === 'streaming');
  const filteredContent = message.content ? fixRepeatText(filterBrokenLinks(message.content)) : '';
  const hasContent = filteredContent && filteredContent.trim().length > 0;

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
                  {filteredContent}
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderRadius: Radius.xl,
    ...Shadows.sm,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
    // Subtle gradient effect via shadow
    ...Platform.select({
      ios: Shadows.glow,
      android: {
        shadowColor: '#3D3935',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
      },
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
      marginBottom: Spacing.xs,
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
      fontStyle: 'italic' as const,
      color: Colors.textInverse,
    },
    link: {
      color: Colors.textInverse,
      textDecorationLine: 'underline' as const,
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
      fontStyle: 'italic' as const,
      color: Colors.textPrimary,
    },
    link: {
      color: Colors.primary,
      textDecorationLine: 'underline' as const,
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
