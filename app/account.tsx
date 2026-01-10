import { DisclaimerModal } from '@/components/disclaimer-modal';
import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useMixpanel } from '@/context/mixpanel-context';
import { useRevenueCat } from '@/context/revenue-cat-context';
import { useClerk, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccountScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { track } = useMixpanel();
  const { isSubscribed, customerInfo, restorePurchases, isLoading: isSubscriptionLoading } = useRevenueCat();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Track page view
  useEffect(() => {
    track('Account Page Viewed');
  }, [track]);

  // Reset form when user data changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Update Failed',
        'There was a problem updating your profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  }, [user, firstName, lastName]);

  const handleCancel = useCallback(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setIsEditing(false);
  }, [user]);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              track('Sign Out');
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              console.error('Error signing out:', error);
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  }, [signOut, router, track]);

  const getInitials = useCallback(() => {
    const first = user?.firstName || '';
    const last = user?.lastName || '';
    if (first && last) {
      return `${first[0]}${last[0]}`.toUpperCase();
    }
    if (first) {
      return first.slice(0, 2).toUpperCase();
    }
    const email = user?.primaryEmailAddress?.emailAddress || '';
    return email.slice(0, 2).toUpperCase();
  }, [user]);

  const formatDate = useCallback((date: Date | null | undefined) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Get subscription expiration date from customer info
  const getSubscriptionExpirationDate = useCallback(() => {
    if (!customerInfo) return null;
    
    // Get the first active entitlement's expiration date
    const activeEntitlements = Object.values(customerInfo.entitlements.active);
    if (activeEntitlements.length > 0) {
      const expDate = activeEntitlements[0].expirationDate;
      if (expDate) {
        return new Date(expDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }
    return null;
  }, [customerInfo]);

  // Handle restore purchases
  const handleRestorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Success', 'Your subscription has been restored!');
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription to restore.');
      }
    } catch {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, [restorePurchases]);

  // Open subscription management in App Store / Play Store
  const handleManageSubscription = useCallback(() => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/account/subscriptions',
      android: 'https://play.google.com/store/account/subscriptions',
    });
    
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open subscription management. Please manage your subscription in the App Store or Google Play.');
      });
    }
  }, []);

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Unable to load account information</Text>
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
          <Text style={styles.headerTitle}>Account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              {user.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{getInitials()}</Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark" size={14} color={Colors.textInverse} />
              </View>
            </View>

            {/* Name display when not editing */}
            {!isEditing && (
              <View style={styles.nameDisplay}>
                <Text style={styles.displayName}>
                  {user.fullName || user.firstName || 'User'}
                </Text>
                <Text style={styles.displayEmail}>
                  {user.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
            )}
          </View>

          {/* Edit Profile Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="person-outline" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Personal Information</Text>
              </View>
              {!isEditing && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={16} color={Colors.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {isEditing ? (
              // Edit mode
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter your first name"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isSaving}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter your last name"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isSaving}
                  />
                </View>

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    activeOpacity={0.7}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    activeOpacity={0.7}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // View mode
              <View style={styles.infoList}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>First Name</Text>
                  <Text style={styles.infoValue}>{user.firstName || '—'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Name</Text>
                  <Text style={styles.infoValue}>{user.lastName || '—'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Account Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="mail-outline" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Contact & Account</Text>
              </View>
            </View>

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>
                  {user.primaryEmailAddress?.emailAddress || '—'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Sign In</Text>
                <Text style={styles.infoValue}>{formatDate(user.lastSignInAt)}</Text>
              </View>
            </View>
          </View>

          {/* Subscription Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="diamond-outline" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Subscription</Text>
              </View>
            </View>

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={styles.securityStatus}>
                  {isSubscriptionLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : isSubscribed ? (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      <Text style={[styles.statusText, styles.securityEnabled]}>Active</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                      <Text style={[styles.statusText, styles.securityDisabled]}>Inactive</Text>
                    </>
                  )}
                </View>
              </View>
              
              {isSubscribed && getSubscriptionExpirationDate() && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Renews</Text>
                    <Text style={styles.infoValue}>{getSubscriptionExpirationDate()}</Text>
                  </View>
                </>
              )}
              
              <View style={styles.divider} />
              
              {isSubscribed ? (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={handleManageSubscription}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoRowContent}>
                    <Ionicons name="settings-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>Manage Subscription</Text>
                  </View>
                  <Ionicons name="open-outline" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={handleRestorePurchases}
                  activeOpacity={0.7}
                  disabled={isRestoring}
                >
                  <View style={styles.infoRowContent}>
                    <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>Restore Purchases</Text>
                  </View>
                  {isRestoring ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

    
          

          {/* Legal & Terms Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Legal & Terms</Text>
              </View>
            </View>

            <View style={styles.infoList}>
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => setShowDisclaimer(true)}
                activeOpacity={0.7}
              >
                <View style={styles.infoRowContent}>
                  <Ionicons name="warning-outline" size={18} color={Colors.primary} />
                  <Text style={styles.infoLabel}>View Disclaimer</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => router.push('/terms')}
                activeOpacity={0.7}
              >
                <View style={styles.infoRowContent}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                  <Text style={styles.infoLabel}>Terms and Conditions</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => router.push('/privacy')}
                activeOpacity={0.7}
              >
                <View style={styles.infoRowContent}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
                  <Text style={styles.infoLabel}>Privacy Policy</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => router.push('/revenuecat-logs')}
                activeOpacity={0.7}
              >
                <View style={styles.infoRowContent}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                  <Text style={styles.infoLabel}>Revenue Cat Logs</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerContent}>
              <Ionicons name="leaf" size={16} color={Colors.primaryLight} />
              <Text style={styles.footerText}>My Materia</Text>
            </View>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <DisclaimerModal 
        visible={showDisclaimer} 
        onAgree={() => setShowDisclaimer(false)} 
        allowDismiss={true}
      />
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
  errorText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
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
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.primary,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.bgSurface,
  },
  nameDisplay: {
    alignItems: 'center',
  },
  displayName: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  displayEmail: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryAlpha10,
  },
  editButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.primary,
  },
  editForm: {
    padding: Spacing.md,
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
  editActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    ...Shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  infoList: {
    paddingVertical: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  infoLabel: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.md,
  },
  securityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '500',
  },
  securityEnabled: {
    color: Colors.success,
  },
  securityDisabled: {
    color: Colors.textMuted,
  },
  infoRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  signOutButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  footerText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  versionText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});
