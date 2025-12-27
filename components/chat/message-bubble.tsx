import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '@/types/chat';
import { ChatColors } from '@/constants/theme';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </View>
      <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: ChatColors.userBubble,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: ChatColors.assistantBubble,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: ChatColors.userText,
  },
  assistantText: {
    color: ChatColors.assistantText,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  userTimestamp: {
    textAlign: 'right',
    color: ChatColors.textMuted,
  },
  assistantTimestamp: {
    textAlign: 'left',
    color: ChatColors.textMuted,
  },
});

