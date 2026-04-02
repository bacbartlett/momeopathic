import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
// import { usePostHogAnalytics } from '@/context/posthog-context';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAction, useQuery } from 'convex/react';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webMaxWidth, WEB_CONTENT_MAX_WIDTH } from '@/lib/web-styles';

/**
 * Convert raw error messages into user-friendly text.
 */
function getFriendlyErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('at least 8 characters')) {
    return 'Password must be at least 8 characters.';
  }

  if (lower.includes('not authenticated')) {
    return 'You must be signed in to change your password. Please sign in and try again.';
  }

  if (lower.includes('rate') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  return 'Could not change your password. Please try again.';
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const user = useQuery(api.users.current);
  const changePassword = useAction(api.changePassword.changePassword);
  // const { track } = usePostHogAnalytics();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const confirmPasswordRef = useRef<TextInput>(null);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await changePassword({ newPassword });
      // track('Password Changed');
      setSuccess(true);
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err);
      if (__DEV__) console.log('[ChangePassword] Error:', err instanceof Error ? err.message : err);
      setError(errorMessage);
      // track('Password Change Failed', { error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (user === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Password Changed</Text>
          <Text style={styles.successMessage}>
            Your password has been updated successfully.
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.doneButtonText}>Back to Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Set New Password</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.description}>
                Choose a new password for your account. Your password must be at least 8 characters long.
              </Text>

              {/* TODO: Before GA release, add current password verification or email
                  verification code flow for additional security. For alpha, being
                  authenticated is sufficient. */}

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!isLoading}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!isLoading}
                  returnKeyType="go"
                  onSubmitEditing={handleChangePassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (isLoading || !newPassword || !confirmPassword) && styles.primaryButtonDisabled]}
                onPress={handleChangePassword}
                disabled={isLoading || !newPassword || !confirmPassword}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.primaryButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['2xl'],
    ...webMaxWidth(WEB_CONTENT_MAX_WIDTH),
  },
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.bgSecondary,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardBody: {
    padding: Spacing.md,
  },
  description: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.sm * 1.5,
    marginBottom: Spacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.error,
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  // Success state styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successIconWrapper: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  successMessage: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    ...Shadows.sm,
  },
  doneButtonText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textInverse,
  },
});
