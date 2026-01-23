import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePostHogAnalytics } from '@/context/posthog-context';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useConvexAuth, useAction, useMutation, useQuery } from 'convex/react';
import * as StoreReview from 'expo-store-review';
import { usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type FeedbackState = 'initial' | 'happy' | 'unhappy' | 'submitting' | 'success';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('initial');
  const [feedbackText, setFeedbackText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Track timeouts for cleanup
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { track } = usePostHogAnalytics();
  const recordFeedbackGiven = useMutation(api.feedback.recordFeedbackGiven);
  const recordDismissed = useMutation(api.feedback.recordFeedbackPromptDismissed);
  const submitFeedback = useAction(api.feedbackEmail.submitFeedback);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Track when modal becomes visible
  useEffect(() => {
    if (visible) {
      track('Feedback Prompt Shown');
      // Reset state when modal opens
      setFeedbackState('initial');
      setFeedbackText('');
      setError(null);
    }
  }, [visible, track]);

  const handleHappyPress = useCallback(async () => {
    track('Feedback Happy Selected');
    setFeedbackState('happy');
    
    try {
      // Mark feedback as given
      await recordFeedbackGiven();
      
      // Check if in-app review is available
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        track('In-App Review Requested');
        await StoreReview.requestReview();
      }
      
      // Close the modal after a brief delay
      closeTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error requesting review:', err);
      // Still close the modal
      closeTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [track, recordFeedbackGiven, onClose]);

  const handleUnhappyPress = useCallback(() => {
    track('Feedback Unhappy Selected');
    setFeedbackState('unhappy');
  }, [track]);

  const handleSubmitFeedback = useCallback(async () => {
    if (!feedbackText.trim()) {
      setError('Please enter some feedback');
      return;
    }

    Keyboard.dismiss();
    setFeedbackState('submitting');
    setError(null);

    try {
      const result = await submitFeedback({ feedback: feedbackText.trim() });
      
      if (result.success) {
        track('Feedback Submitted');
        setFeedbackState('success');
        
        // Close modal after showing success
        closeTimeoutRef.current = setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error ?? 'Failed to submit feedback');
        setFeedbackState('unhappy');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
      setFeedbackState('unhappy');
    }
  }, [feedbackText, submitFeedback, track, onClose]);

  const handleDismiss = useCallback(async () => {
    track('Feedback Prompt Dismissed');
    try {
      await recordDismissed();
    } catch (err) {
      console.error('Error recording dismissal:', err);
    }
    onClose();
  }, [track, recordDismissed, onClose]);

  const renderInitialState = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>How are you enjoying My Materia?</Text>
        <Text style={styles.subtitle}>Your feedback helps us improve!</Text>
      </View>

      <View style={styles.emojiContainer}>
        <TouchableOpacity
          style={styles.emojiButton}
          onPress={handleUnhappyPress}
          activeOpacity={0.7}
          accessibilityLabel="Not enjoying the app"
          accessibilityRole="button"
        >
          <Text style={styles.emoji}>😞</Text>
          <Text style={styles.emojiLabel}>Not great</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.emojiButton}
          onPress={handleHappyPress}
          activeOpacity={0.7}
          accessibilityLabel="Enjoying the app"
          accessibilityRole="button"
        >
          <Text style={styles.emoji}>😊</Text>
          <Text style={styles.emojiLabel}>Love it!</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        activeOpacity={0.7}
      >
        <Text style={styles.dismissText}>Maybe later</Text>
      </TouchableOpacity>
    </>
  );

  const renderHappyState = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.title}>Thanks for your support!</Text>
        <Text style={styles.subtitle}>
          We're so glad you're enjoying My Materia
        </Text>
      </View>

      <View style={styles.successContent}>
        <Ionicons name="heart" size={48} color={Colors.error} />
      </View>
    </>
  );

  const renderUnhappyState = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>We'd love to hear from you</Text>
        <Text style={styles.subtitle}>
          Tell us how we can make My Materia better
        </Text>
      </View>

      <View style={styles.feedbackForm}>
        <TextInput
          style={styles.feedbackInput}
          multiline
          placeholder="What could we improve?"
          placeholderTextColor={Colors.textMuted}
          value={feedbackText}
          onChangeText={setFeedbackText}
          maxLength={1000}
          textAlignVertical="top"
          autoFocus
        />
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            !feedbackText.trim() && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitFeedback}
          activeOpacity={0.8}
          disabled={!feedbackText.trim()}
        >
          <Text style={styles.submitButtonText}>Submit Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderSubmittingState = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Sending feedback...</Text>
      </View>

      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    </>
  );

  const renderSuccessState = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.successEmoji}>💚</Text>
        <Text style={styles.title}>Thank you!</Text>
        <Text style={styles.subtitle}>
          Your feedback helps us make My Materia better for everyone
        </Text>
      </View>

      <View style={styles.successContent}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
      </View>
    </>
  );

  const renderContent = () => {
    switch (feedbackState) {
      case 'initial':
        return renderInitialState();
      case 'happy':
        return renderHappyState();
      case 'unhappy':
        return renderUnhappyState();
      case 'submitting':
        return renderSubmittingState();
      case 'success':
        return renderSuccessState();
      default:
        return renderInitialState();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </TouchableOpacity>

          {renderContent()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Hook to check if the feedback prompt should be shown.
 */
export function useFeedbackStatus() {
  const feedbackStatus = useQuery(api.feedback.getFeedbackStatus);
  return feedbackStatus;
}

/**
 * Component that manages the feedback modal visibility.
 * Should be rendered inside ConvexProviderWithClerk and ChatProvider.
 */
export function FeedbackManager() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const feedbackStatus = useFeedbackStatus();
  const pathname = usePathname();
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);

  useEffect(() => {
    // Don't show if auth is still loading
    if (isAuthLoading) {
      return;
    }

    // Don't show if user is not authenticated
    if (!isAuthenticated) {
      return;
    }

    // Don't show on certain pages
    if (pathname === '/terms' || pathname === '/privacy' || pathname === '/delete-account') {
      return;
    }

    // Don't show if we've already shown this session
    if (hasShownThisSession) {
      return;
    }

    // Don't show if feedback status hasn't loaded yet
    if (!feedbackStatus) {
      return;
    }

    // Show the prompt if threshold is reached
    if (feedbackStatus.shouldShowPrompt) {
      // Add a small delay so it doesn't appear immediately on app launch
      const timer = setTimeout(() => {
        setShowFeedback(true);
        setHasShownThisSession(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isAuthLoading, feedbackStatus, pathname, hasShownThisSession]);

  const handleClose = useCallback(() => {
    setShowFeedback(false);
  }, []);

  return <FeedbackModal visible={showFeedback} onClose={handleClose} />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 57, 53, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.xl,
    width: '100%',
    maxWidth: 380,
    padding: Spacing.xl,
    ...Shadows.lg,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts?.headingBold ?? 'System',
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emojiContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginVertical: Spacing.lg,
  },
  emojiButton: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryAlpha10,
    minWidth: 100,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emojiLabel: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  dismissText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  feedbackForm: {
    gap: Spacing.md,
  },
  feedbackInput: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 120,
    maxHeight: 200,
    ...Platform.select({
      ios: {},
      android: {
        textAlignVertical: 'top',
      },
    }),
  },
  errorText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.borderLight,
  },
  submitButtonText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
});
