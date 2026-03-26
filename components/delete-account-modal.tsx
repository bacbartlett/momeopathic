import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePostHogAnalytics } from '@/context/posthog-context';
import { api } from '@/convex/_generated/api';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation, useQuery } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ visible, onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const user = useQuery(api.users.current);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { signIn, signOut } = useAuthActions();
  const { track } = usePostHogAnalytics();
  
  const [step, setStep] = useState<'warning' | 'password'>('warning');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = () => {
    setStep('password');
    setError('');
    setPassword('');
  };

  const handleCancel = () => {
    setStep('warning');
    setPassword('');
    setError('');
    onClose();
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      setError('Unable to verify account. Please try again.');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const emailAddress = user.email;
      if (!emailAddress) {
        throw new Error('Email address not found');
      }

      // Verify password by attempting to sign in
      await signIn('password', { email: emailAddress, password, flow: 'signIn' });

      // Password verified, proceed with deletion
      await deleteAccount();
      track('Account Deleted');
      // Sign out to invalidate the session, then redirect
      await signOut();
      try {
        router.replace('/(auth)/sign-in');
      } catch (navError) {
        console.error('Navigation error after account deletion:', navError);
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      if (err instanceof Error) {
        // Check if it's a password error
        if (err.message.includes('password') || err.message.includes('invalid') || err.message.includes('credentials')) {
          setError('Incorrect password. Please try again.');
        } else {
          setError(err.message || 'Failed to delete account. Please try again.');
        }
      } else {
        setError('Failed to delete account. Please try again.');
      }
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayPressable} onPress={handleCancel} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContainer}>
            {step === 'warning' ? (
              <>
                {/* Warning Step */}
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="warning" size={32} color={Colors.error} />
                  </View>
                  <Text style={styles.title}>Delete Account</Text>
                  <Text style={styles.subtitle}>This action cannot be undone</Text>
                </View>

                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.warningBox}>
                    <Ionicons name="alert-circle" size={24} color={Colors.error} />
                    <Text style={styles.warningTitle}>Permanent Deletion</Text>
                    <Text style={styles.warningText}>
                      Deleting your account will permanently remove all your data, including your chat history, preferences, and account information. This action cannot be reversed.
                    </Text>
                  </View>

                </ScrollView>

                <View style={styles.footer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinue}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.continueButtonText}>I Understand, Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Password Step */}
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="lock-closed" size={32} color={Colors.primary} />
                  </View>
                  <Text style={styles.title}>Confirm Password</Text>
                  <Text style={styles.subtitle}>
                    Enter your password to confirm account deletion
                  </Text>
                </View>

                <View style={styles.passwordContent}>
                  {error ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={20} color={Colors.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setError('');
                      }}
                      placeholder="Enter your password"
                      placeholderTextColor={Colors.textMuted}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      editable={!isDeleting}
                      onSubmitEditing={handleDeleteAccount}
                    />
                  </View>
                </View>

                <View style={styles.footer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    activeOpacity={0.7}
                    disabled={isDeleting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.7}
                    disabled={isDeleting || !password}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={18} color={Colors.textInverse} />
                        <Text style={styles.deleteButtonText}>Delete Account</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  warningBox: {
    backgroundColor: Colors.error + '10',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  warningTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.error,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  warningText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    lineHeight: Typography.base * Typography.leading,
  },
  passwordContent: {
    padding: Spacing.lg,
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
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
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
    ...Shadows.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.bgSecondary,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  continueButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  continueButtonText: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.error,
    ...Shadows.sm,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
});
