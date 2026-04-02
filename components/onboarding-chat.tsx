import { CURRENT_AI_CONSENT_VERSION } from '@/constants/ai-consent';
import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
// import { usePostHogAnalytics } from '@/context/posthog-context';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConvexAuth, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { webMaxWidth, WEB_CHAT_MAX_WIDTH } from '@/lib/web-styles';

const DISCLAIMER_AGREED_KEY = 'disclaimer_agreed';

// Typing indicator component
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingRow}>
      <View style={styles.avatarContainer}>
        <Ionicons name="leaf" size={16} color={Colors.primary} />
      </View>
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              { opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// The onboarding messages Rosemary will send
const ONBOARDING_MESSAGES = [
  "Hi, I'm Rosemary! 🌿 Welcome to the Momeopath's Insider Circle Acute Care App. I'm here to help you explore homeopathic remedies from Boericke's Materia Medica.",
  "Think of me as a study partner — I can help you learn about remedies, but I'm not a doctor.",
  "Quick note on how I work — when you ask me about remedies, I search through the Boericke Materia Medica and use Anthropic's AI (Claude) to help match your symptoms to the right remedies. Your messages are processed by Anthropic through OpenRouter to generate my responses. No personal health data is stored by these services beyond what's needed to reply to you.",
  "I can get things wrong sometimes. For anything serious, always talk to a real healthcare provider.",
  "You'll need to be 18+ to use this app (or have a parent's okay).",
];

// The final message includes links — handled separately
const TERMS_MESSAGE_PREFIX = "You can read our ";
const TERMS_MESSAGE_SUFFIX = " anytime. Ready to get started?";

interface OnboardingMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  isTermsMessage?: boolean;
}

interface OnboardingChatProps {
  onComplete: () => void;
}

export function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const [visibleMessages, setVisibleMessages] = useState<OnboardingMessage[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAgreeButton, setShowAgreeButton] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { isAuthenticated } = useConvexAuth();
  const acceptDisclaimer = useMutation(api.users.acceptDisclaimer);
  const acceptAiConsent = useMutation(api.users.acceptAiConsent);
  const router = useRouter();
  // const { track } = usePostHogAnalytics();

  // Total messages: regular messages + terms message
  const totalMessages = ONBOARDING_MESSAGES.length + 1;

  // Track onboarding start
  useEffect(() => {
    // track('Onboarding Started');
  }, []);

  // Stream messages in one at a time
  useEffect(() => {
    if (currentIndex >= totalMessages) {
      // All messages shown, reveal agree button
      setIsTyping(false);
      setShowAgreeButton(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    // Show typing indicator, then reveal message
    setIsTyping(true);
    const typingDelay = currentIndex === 0 ? 800 : 1200; // Shorter for first message

    const timer = setTimeout(() => {
      setIsTyping(false);

      const isTerms = currentIndex >= ONBOARDING_MESSAGES.length;
      const newMessage: OnboardingMessage = {
        id: `onboarding-${currentIndex}`,
        role: 'assistant',
        content: isTerms ? '' : ONBOARDING_MESSAGES[currentIndex],
        isTermsMessage: isTerms,
      };

      setVisibleMessages(prev => [...prev, newMessage]);

      // Brief pause before next typing indicator
      const nextTimer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 400);

      return () => clearTimeout(nextTimer);
    }, typingDelay);

    return () => clearTimeout(timer);
  }, [currentIndex, totalMessages, fadeAnim]);

  // Scroll to bottom when new messages appear
  useEffect(() => {
    if (visibleMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visibleMessages.length, isTyping]);

  const handleTermsPress = useCallback(() => {
    router.push('/terms');
  }, [router]);

  const handlePrivacyPress = useCallback(() => {
    router.push('/privacy');
  }, [router]);

  const handleAgree = useCallback(async () => {
    try {
      // Add user's "agree" message
      setVisibleMessages(prev => [
        ...prev,
        {
          id: 'user-agree',
          role: 'user',
          content: 'I agree ✓',
        },
      ]);
      setShowAgreeButton(false);

      // Save agreement (disclaimer + AI consent)
      await AsyncStorage.setItem(DISCLAIMER_AGREED_KEY, 'true');

      try {
        if (isAuthenticated) {
          await acceptDisclaimer();
          await acceptAiConsent({ version: CURRENT_AI_CONSENT_VERSION });
        }
      } catch (dbError) {
        console.error('Failed to save consent to database:', dbError);
      }

      // track('Disclaimer Accepted', { method: 'onboarding_chat' });
      // track('AI Consent Given', { version: CURRENT_AI_CONSENT_VERSION });
      // track('Onboarding Completed');

      // Brief pause to show the agree message, then transition
      setTimeout(() => {
        onComplete();
      }, 600);
    } catch (error) {
      console.error('Failed to save disclaimer agreement:', error);
      onComplete();
    }
  }, [isAuthenticated, acceptDisclaimer, acceptAiConsent, onComplete]);

  const renderMessage = useCallback(({ item }: { item: OnboardingMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // Assistant message
    return (
      <View style={styles.assistantRow}>
        <View style={styles.avatarContainer}>
          <Ionicons name="leaf" size={16} color={Colors.primary} />
        </View>
        <View style={styles.assistantBubble}>
          {item.isTermsMessage ? (
            <Text style={styles.assistantText}>
              {TERMS_MESSAGE_PREFIX}
              <Text style={styles.linkText} onPress={handleTermsPress}>
                Terms and Conditions
              </Text>
              {' and '}
              <Text style={styles.linkText} onPress={handlePrivacyPress}>
                Privacy Policy
              </Text>
              {TERMS_MESSAGE_SUFFIX}
            </Text>
          ) : (
            <Text style={styles.assistantText}>{item.content}</Text>
          )}
        </View>
      </View>
    );
  }, [handleTermsPress, handlePrivacyPress]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
      />

      {/* Agree button area — only rendered once ready, fades in with the footer */}
      {showAgreeButton && (
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.agreeButton}
            onPress={handleAgree}
            activeOpacity={0.8}
          >
            <Text style={styles.agreeButtonText}>I agree — let's go!</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ChatColors.background,
  },
  listContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexGrow: 1,
    ...webMaxWidth(WEB_CHAT_MAX_WIDTH),
  },
  // Assistant messages (left-aligned)
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingRight: Spacing.xl,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  assistantBubble: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    borderTopLeftRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    ...Shadows.sm,
    flexShrink: 1,
  },
  assistantText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    lineHeight: Typography.base * 1.5,
    color: Colors.textPrimary,
  },
  linkText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  // User messages (right-aligned)
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.md,
    paddingLeft: Spacing.xl,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    borderTopRightRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    ...Shadows.sm,
  },
  userText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    lineHeight: Typography.base * 1.5,
    color: Colors.textInverse,
  },
  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    borderTopLeftRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 6,
    ...Shadows.sm,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  // Footer
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: ChatColors.composerBackground,
    ...Shadows.sm,
    ...webMaxWidth(WEB_CHAT_MAX_WIDTH),
  },
  agreeButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  agreeButtonText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textInverse,
  },
});
