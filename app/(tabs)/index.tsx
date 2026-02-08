import { Composer, ComposerHandle } from '@/components/chat/composer';
import { MessageList, MessageListHandle } from '@/components/chat/message-list';
import { ThreadDrawer } from '@/components/chat/thread-drawer';
import { GuestSignUpModal } from '@/components/guest-signup-modal';
import { Paywall } from '@/components/paywall';
import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useChat } from '@/context/chat-context';
import { useRevenueCat, useSubscription } from '@/context/revenue-cat-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { api } from '../../convex/_generated/api';

export default function ChatScreen() {
  const router = useRouter();
  const {
    state,
    activeThread,
    isLoading,
    isMessagesLoading,
    isAuthenticated,
    isGuest,
    isCreatingThread,
    guestLimitReached,
    clearGuestLimitReached,
    createThread,
    sendMessage,
  } = useChat();
  const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
  const { isInitialized } = useRevenueCat();
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [keyboardKey, setKeyboardKey] = useState(0);
  const messageListRef = useRef<MessageListHandle>(null);
  const composerRef = useRef<ComposerHandle>(null);

  // Create initial thread if none exists and user is authenticated or guest
  useEffect(() => {
    if (!isLoading && (isAuthenticated || isGuest) && state.threads.length === 0 && !isCreatingThread) {
      createThread().catch((error) => {
        console.error('[ChatScreen] Failed to create initial thread:', error);
      });
    }
  }, [isLoading, isAuthenticated, isGuest, state.threads.length, isCreatingThread, createThread]);

  // Blur composer when drawer opens to collapse keyboard
  useEffect(() => {
    if (isDrawerOpen) {
      composerRef.current?.blur();
    }
  }, [isDrawerOpen]);

  // Handle keyboard dismiss on Android
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardKey(prev => prev + 1);
    });

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  // Show loading while checking auth or subscription status
  // For guests, skip the currentUser and subscription checks
  if (isLoading || (!isGuest && (isSubscriptionLoading || (isAuthenticated && currentUser === undefined)))) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Getting things ready...</Text>
      </View>
    );
  }

  // Check if user has noPaywall flag set to true
  const hasNoPaywall = currentUser?.noPaywall === true;

  // Show paywall only for authenticated (non-guest) users who are not subscribed
  if (isAuthenticated && !isGuest && !isSubscribed && isInitialized && !hasNoPaywall) {
    return <Paywall />;
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
            accessibilityLabel="Open menu"
            accessibilityRole="button"
            accessibilityHint="Opens the conversation drawer"
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

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => router.push('/materia-medica' as '/account')}
              activeOpacity={0.7}
              accessibilityLabel="Open Materia Medica"
              accessibilityRole="button"
              accessibilityHint="Opens the remedy reference library"
            >
              <Ionicons name="book-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => {
                createThread().catch((error) => {
                  console.error('[ChatScreen] Failed to create thread:', error);
                });
              }}
              activeOpacity={0.7}
              accessibilityLabel="New conversation"
              accessibilityRole="button"
              accessibilityHint="Creates a new conversation thread"
            >
              <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Guest banner */}
        {isGuest && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => router.push('/(auth)/sign-up')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={14} color={Colors.primary} />
            <Text style={styles.guestBannerText}>
              Sign up to save your conversations
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.messagesContainer}>
        <MessageList ref={messageListRef} messages={activeThread?.messages ?? []} isLoading={isMessagesLoading} />
      </View>

      <Composer ref={composerRef} onSend={sendMessage} disabled={!activeThread} />
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior="padding"
        >
          {content}
        </KeyboardAvoidingView>
      ) : Platform.OS === 'android' ? (
        <KeyboardAvoidingView
          key={keyboardKey}
          style={styles.keyboardAvoidingView}
          behavior="height"
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.keyboardAvoidingView}>{content}</View>
      )}

      <ThreadDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Guest sign-up modal when thread limit reached */}
      <GuestSignUpModal
        visible={guestLimitReached}
        onDismiss={clearGuestLimitReached}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: Colors.primaryAlpha10,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryAlpha20,
  },
  guestBannerText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.primary,
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
