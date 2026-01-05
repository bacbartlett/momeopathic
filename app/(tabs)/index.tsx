import { Composer } from '@/components/chat/composer';
import { MessageList, MessageListHandle } from '@/components/chat/message-list';
import { ThreadDrawer } from '@/components/chat/thread-drawer';
import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useChat } from '@/context/chat-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { state, activeThread, isLoading, isMessagesLoading, isAuthenticated, createThread, sendMessage } = useChat();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const messageListRef = useRef<MessageListHandle>(null);

  const handleComposerFocus = useCallback(() => {
    // On Android, scroll immediately (current working behavior)
    // On iOS, let the keyboardDidShow listener handle the scroll after animation completes
    if (Platform.OS === 'android') {
      messageListRef.current?.scrollToBottom();
    }
  }, []);

  // Listen for keyboard events on iOS to scroll after keyboard animation completes
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      // Small delay to ensure layout is settled after keyboard animation
      setTimeout(() => {
        messageListRef.current?.scrollToBottom();
      }, 100);
    });

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // Create initial thread if none exists and user is authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && state.threads.length === 0) {
      createThread();
    }
  }, [isLoading, isAuthenticated, state.threads.length, createThread]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Getting things ready...</Text>
      </View>
    );
  }

  const content = (
    <>
      {/* Header with gradient accent */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setIsDrawerOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <View style={styles.logoContainer}>
              <Ionicons name="leaf" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeThread?.title ?? 'New Conversation'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newChatButton}
            onPress={createThread}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        
      </View>

      <View style={styles.messagesContainer}>
        <MessageList ref={messageListRef} messages={activeThread?.messages ?? []} isLoading={isMessagesLoading} />
      </View>

      <Composer onSend={sendMessage} disabled={!activeThread} onFocus={handleComposerFocus} />
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {Platform.OS === 'ios' || Platform.OS === 'android' ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior="padding"
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.keyboardAvoidingView}>{content}</View>
      )}

      <ThreadDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ChatColors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ChatColors.background,
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: ChatColors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: ChatColors.border,
    ...Shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryAlpha10,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    maxWidth: 180,
  },
  newChatButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  trustBanner: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  trustBannerText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
});
