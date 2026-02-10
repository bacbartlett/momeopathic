import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePostHogAnalytics } from '@/context/posthog-context';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
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

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

interface GuestSignUpModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function GuestSignUpModal({ visible, onDismiss }: GuestSignUpModalProps) {
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { track } = usePostHogAnalytics();

  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const resetState = () => {
    setEmailAddress('');
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setPendingVerification(false);
    setIsLoading(false);
    setError('');
  };

  const handleAuthComplete = () => {
    resetState();
    onDismiss();
  };

  // Sign Up flow
  const handleSignUp = async () => {
    if (!isSignUpLoaded || !signUp) return;

    if (!isValidEmail(emailAddress)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySignUp = async () => {
    if (!isSignUpLoaded || !signUp) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        track('Sign Up', { method: 'email', from_guest: true });
        handleAuthComplete();
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign In flow
  const handleSignIn = async () => {
    if (!isSignInLoaded || !signIn) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        track('Sign In', { method: 'email', from_guest: true });
        handleAuthComplete();
      } else {
        setError('Sign in incomplete. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isSignUpLoaded || !signUp) return;
    setIsLoading(true);
    setError('');
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    resetState();
    onDismiss();
  };

  // Verification screen
  if (pendingVerification) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleDismiss}>
        <View style={styles.overlay}>
          <Pressable style={styles.overlayPressable} onPress={handleDismiss} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleDismiss}
                  accessibilityLabel="Close sign up modal"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.logoContainer}>
                  <Ionicons name="mail" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.title}>Verify Your Email</Text>
                <Text style={styles.subtitle}>
                  We sent a code to {emailAddress}
                </Text>
              </View>

              <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={18} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifySignUp}
                  disabled={isLoading || verificationCode.length < 6}
                  activeOpacity={0.7}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify Email</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>{"Didn't receive the code?"}</Text>
                  <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
                    <Text style={styles.resendLink}>Resend Code</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setPendingVerification(false);
                    setVerificationCode('');
                    setError('');
                  }}
                  disabled={isLoading}
                >
                  <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayPressable} onPress={handleDismiss} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleDismiss}
                accessibilityLabel="Close sign up modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Ionicons name="leaf" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.title}>
                {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'signup'
                  ? 'Sign up to save your conversations and continue chatting'
                  : 'Sign in to your existing account'}
              </Text>
            </View>

            <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete={mode === 'signup' ? 'password-new' : 'password'}
                  editable={!isLoading}
                />
              </View>

              {mode === 'signup' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                    editable={!isLoading}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={mode === 'signup' ? handleSignUp : handleSignIn}
                disabled={isLoading || !emailAddress || !password || (mode === 'signup' && !confirmPassword)}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signup' ? 'Sign Up' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchModeLink}
                onPress={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setError('');
                }}
                disabled={isLoading}
              >
                <Text style={styles.switchModeText}>
                  {mode === 'signup'
                    ? 'Already have an account? '
                    : "Don\u2019t have an account? "}
                  <Text style={styles.switchModeBold}>
                    {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dismissLink} onPress={handleDismiss}>
                <Text style={styles.dismissText}>Continue as guest</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 57, 53, 0.7)',
    justifyContent: 'flex-end',
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
    ...Shadows.lg,
    overflow: 'hidden',
    zIndex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgPrimary,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha20,
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
  formScroll: {
    maxHeight: 500,
  },
  form: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.error,
    flex: 1,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.bgPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: Typography['2xl'],
    letterSpacing: 8,
    fontFamily: Fonts?.heading ?? 'System',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
  switchModeLink: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  switchModeText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  switchModeBold: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  dismissLink: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dismissText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  resendText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  backButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
});
