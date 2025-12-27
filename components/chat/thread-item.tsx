import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Thread } from '@/types/chat';
import { ChatColors } from '@/constants/theme';

interface ThreadItemProps {
  thread: Thread;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
}

export function ThreadItem({ thread, isActive, onPress, onDelete }: ThreadItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.containerActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Ionicons
          name="chatbubble-outline"
          size={18}
          color={isActive ? ChatColors.accent : ChatColors.textMuted}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>
            {thread.title}
          </Text>
          <Text style={styles.date}>{formatDate(thread.updatedAt)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation?.();
          onDelete();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={16} color={ChatColors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  containerActive: {
    backgroundColor: ChatColors.drawerItemBackground,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: ChatColors.text,
    marginBottom: 2,
  },
  titleActive: {
    color: ChatColors.text,
  },
  date: {
    fontSize: 12,
    color: ChatColors.textMuted,
  },
  deleteButton: {
    padding: 4,
    opacity: 0.6,
  },
});

