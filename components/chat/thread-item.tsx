import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { Thread } from '@/types/chat';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
      accessibilityLabel={`${thread.title} conversation, ${isActive ? 'currently active' : ''} ${formatDate(thread.updatedAt)}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
          <Ionicons
            name={isActive ? 'chatbubble' : 'chatbubble-outline'}
            size={16}
            color={isActive ? Colors.primary : Colors.textMuted}
          />
        </View>
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
        accessibilityLabel={`Delete ${thread.title} conversation`}
        accessibilityRole="button"
        accessibilityHint="Removes this conversation permanently"
      >
        <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: 'transparent',
  },
  containerActive: {
    backgroundColor: Colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: Colors.primaryAlpha20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: Colors.primaryAlpha20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  titleActive: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  date: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
});
