import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePostHogAnalytics } from '@/context/posthog-context';
import { useSignIn } from '@clerk/clerk-expo';
import type { EmailCodeFactor } from '@clerk/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ResetStep = 'email' | 'code' | 'password';

/**
 * Simple email validation - checks for basic format.
 * Returns true if email appears valid.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { track } = usePostHogAnalytics();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailCode, setShowEmailCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Password reset state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignIn = async () => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        track('Sign In', { method: 'email' });
        setError(''); // Clear error on success
        try {
          router.replace('/(tabs)');
        } catch (navError) {
          console.error('[SignIn] Navigation error:', navError);
        }
      } else if (result.status === 'needs_second_factor') {
        // Check if email_code is a valid second factor
        // This is required when Client Trust is enabled and the user
        // is signing in from a new device.
        const emailCodeFactor = result.supportedSecondFactors?.find(
          (factor): factor is EmailCodeFactor => factor.strategy === 'email_code',
        );

        if (emailCodeFactor) {
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setShowEmailCode(true);
        } else {
          setError('Second factor authentication required but email code is not available.');
        }
      } else {
        setError('Sign in incomplete. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during sign in. Please try again.';
      setError(errorMessage);
      track('Sign In Failed', { method: 'email', error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code: verificationCode,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        track('Sign In', { method: 'email', mfa: true });
        setError(''); // Clear error on success
        try {
          router.replace('/(tabs)');
        } catch (navError) {
          console.error('[SignIn] Navigation error:', navError);
        }
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code. Please try again.';
      setError(errorMessage);
      track('Sign In Failed', { method: 'email', mfa: true, error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError('');

    try {
      const emailCodeFactor = signIn.supportedSecondFactors?.find(
        (factor): factor is EmailCodeFactor => factor.strategy === 'email_code',
      );

      if (emailCodeFactor) {
        await signIn.prepareSecondFactor({
          strategy: 'email_code',
          emailAddressId: emailCodeFactor.emailAddressId,
        });
        setError(''); // Clear any previous error
      } else {
        setError('Unable to resend code. Please try signing in again.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resend code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Password reset handlers
  const handleSendResetCode = async () => {
    if (!isLoaded || !signIn) return;

    // Validate email format
    if (!isValidEmail(forgotPasswordEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: forgotPasswordEmail.trim(),
      });
      setResetStep('code');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send reset code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError('');

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: forgotPasswordEmail,
      });
      setError(''); // Clear any previous error
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resend code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!isLoaded || !signIn) return;

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
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode,
        password: newPassword,
      });

      if (result.status === 'needs_second_factor') {
        // Handle 2FA if required
        setError('Two-factor authentication is required. Please sign in normally.');
        resetForgotPasswordState();
      } else if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        track('Password Reset', { method: 'email_code' });
        setError(''); // Clear error on success
        try {
          router.replace('/(tabs)');
        } catch (navError) {
          console.error('[SignIn] Navigation error:', navError);
        }
      } else {
        setError('Password reset incomplete. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setError(errorMessage);
      track('Password Reset Failed', { method: 'email_code', error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForgotPasswordState = () => {
    setShowForgotPassword(false);
    setResetStep('email');
    setForgotPasswordEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  // Verification code screen
  if (showEmailCode) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="mail" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                We sent a verification code to{'\n'}
                <Text style={styles.emailText}>{emailAddress}</Text>
              </Text>
            </View>

            {/* Verification Form */}
            <View style={styles.form}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={Colors.error} />
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
                style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                onPress={handleVerifyCode}
                disabled={isLoading || verificationCode.length < 6}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={styles.signInButtonText}>Verify Email</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={isLoading}
                >
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setShowEmailCode(false);
                  setVerificationCode('');
                  setError('');
                }}
                disabled={isLoading}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
                <Text style={styles.backButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Password reset flow
  if (showForgotPassword) {
    // Step 1: Enter email
    if (resetStep === 'email') {
      return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <Ionicons name="key" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email and we'll send you a code to reset your password
                </Text>
              </View>

              <View style={styles.form}>
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={forgotPasswordEmail}
                    onChangeText={setForgotPasswordEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                  onPress={handleSendResetCode}
                  disabled={isLoading || !forgotPasswordEmail}
                  activeOpacity={0.7}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.signInButtonText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={resetForgotPasswordState}
                  disabled={isLoading}
                >
                  <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
                  <Text style={styles.backButtonText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      );
    }

    // Step 2: Enter verification code and new password
    if (resetStep === 'code') {
      return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <Ionicons name="mail" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.title}>Check Your Email</Text>
                <Text style={styles.subtitle}>
                  We sent a code to{'\n'}
                  <Text style={styles.emailText}>{forgotPasswordEmail}</Text>
                </Text>
              </View>

              <View style={styles.form}>
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    value={resetCode}
                    onChangeText={setResetCode}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!isLoading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                  onPress={handleVerifyResetCode}
                  disabled={isLoading || resetCode.length < 6 || !newPassword || !confirmPassword}
                  activeOpacity={0.7}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.signInButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code?</Text>
                  <TouchableOpacity
                    onPress={handleResendResetCode}
                    disabled={isLoading}
                  >
                    <Text style={styles.resendLink}>Resend Code</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setResetStep('email');
                    setResetCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  disabled={isLoading}
                >
                  <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      );
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="leaf" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
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
                placeholder="Enter your password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => {
                setShowForgotPassword(true);
                setForgotPasswordEmail(emailAddress); // Pre-fill with current email if any
                setError('');
              }}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
              onPress={handleSignIn}
              disabled={isLoading || !emailAddress || !password}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpLink}
              onPress={() => router.push('/(auth)/sign-up')}
              disabled={isLoading}
            >
              <Text style={styles.signUpLinkText}>
                Don't have an account? <Text style={styles.signUpLinkBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['3xl'],
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  emailText: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  form: {
    width: '100%',
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
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.bgSurface,
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
  codeInput: {
    textAlign: 'center',
    fontSize: Typography['2xl'],
    letterSpacing: 8,
    fontFamily: Fonts?.heading ?? 'System',
  },
  signInButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
  signUpLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  signUpLinkText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  signUpLinkBold: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  forgotPasswordText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.primary,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
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
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  backButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
});
