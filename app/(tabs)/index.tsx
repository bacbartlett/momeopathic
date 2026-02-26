import { Composer, ComposerHandle } from '@/components/chat/composer';
import { MessageList } from '@/components/chat/message-list';
import { useHasAcceptedDisclaimer } from '@/components/disclaimer-modal';
import { GuestSignUpModal } from '@/components/guest-signup-modal';
import { OnboardingChat } from '@/components/onboarding-chat';
import { PaywallModal } from '@/components/paywall-modal';
import { TrialIndicator } from '@/components/trial-indicator';
import { TrialLockoutModal } from '@/components/trial-lockout-modal';
import { TrialStartModal } from '@/components/trial-start-modal';
import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useChat } from '@/context/chat-context';
import { useSubscription } from '@/context/revenue-cat-context';
import { useTrialContext } from '@/context/trial-context';
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
    activeThread,
    isLoading,
    isMessagesLoading,
    isAuthenticated,
    isGuest,
    guestLimitReached,
    clearGuestLimitReached,
    sendMessage,
    debugForceDivider,
  } = useChat();
  const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
  const {
    isLoading: isTrialLoading,
    shouldShowTrialModal,
    isInTrial,
    trialDaysRemaining,
    trialExpired,
    canUseApp,
    startTrial,
  } = useTrialContext();
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const [keyboardKey, setKeyboardKey] = useState(0);
  const composerRef = useRef<ComposerHandle>(null);
  const [showGuestSignUpModal, setShowGuestSignUpModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showLockoutModal, setShowLockoutModal] = useState(true);
  const hasAcceptedDisclaimer = useHasAcceptedDisclaimer();
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Thread initialization is now handled by chat-context via getOrCreate

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

  useEffect(() => {
    if (trialExpired && !isSubscribed) {
      setShowLockoutModal(true);
    }
  }, [trialExpired, isSubscribed]);

  // Show loading while checking auth or subscription status
  // For guests, skip the currentUser and subscription checks
  if (isLoading || (!isGuest && (isSubscriptionLoading || isTrialLoading || (isAuthenticated && currentUser === undefined)))) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Getting things ready...</Text>
      </View>
    );
  }

  // Check if user has noPaywall flag set to true
  const hasNoPaywall = currentUser?.noPaywall === true;

  const shouldUseTrialUI = isAuthenticated && !isGuest && !hasNoPaywall;
  const canUseChat = shouldUseTrialUI ? canUseApp : true;
  const showTrialIndicator = shouldUseTrialUI && isInTrial && !isSubscribed && trialDaysRemaining !== null;

  const content = (
    <>
      {/* Simplified header for single-thread mode */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Account button (left) */}
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => {
              if (isGuest) {
                setShowGuestSignUpModal(true);
                return;
              }
              router.push('/account');
            }}
            activeOpacity={0.7}
            accessibilityLabel={isGuest ? 'Create account' : 'Account settings'}
            accessibilityRole="button"
          >
            <Ionicons name="person-circle-outline" size={26} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* App title (center) */}
          <View style={styles.headerTitleContainer}>
            <View style={styles.logoContainer}>
              <Ionicons name="leaf" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>My Materia</Text>
          </View>

          <View style={styles.headerRightSection}>
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
            {showTrialIndicator && trialDaysRemaining !== null && (
              <TrialIndicator
                trialDaysRemaining={trialDaysRemaining}
                onPress={() => setShowPaywallModal(true)}
              />
            )}
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

      {/* Show onboarding chat if disclaimer not yet accepted */}
      {hasAcceptedDisclaimer === false && !onboardingComplete ? (
        <OnboardingChat onComplete={() => setOnboardingComplete(true)} />
      ) : (
        <>
          <View style={styles.messagesContainer}>
            <MessageList 
              messages={activeThread?.messages ?? []} 
              isLoading={isMessagesLoading}
              forceDivider={debugForceDivider}
              threadKey={activeThread?.id ?? null}
            />
          </View>

          <Composer
            ref={composerRef}
            onSend={sendMessage}
            disabled={!activeThread || !canUseChat}
            containerStyle={!canUseChat ? styles.disabledComposer : undefined}
          />
        </>
      )}
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

      {/* Guest sign-up modal when thread limit reached */}
      <GuestSignUpModal
        visible={guestLimitReached || showGuestSignUpModal}
        onDismiss={() => {
          clearGuestLimitReached();
          setShowGuestSignUpModal(false);
        }}
      />

      <TrialStartModal
        visible={shouldUseTrialUI && shouldShowTrialModal}
        onStartTrial={startTrial}
      />

      <TrialLockoutModal
        visible={shouldUseTrialUI && trialExpired && !isSubscribed && showLockoutModal}
        onViewPlans={() => setShowPaywallModal(true)}
        onMaybeLater={() => setShowLockoutModal(false)}
      />

      <PaywallModal
        visible={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
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
  headerRightSection: {
    alignItems: 'flex-end',
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
  disabledComposer: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
});
