import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface AccountBadgeProps {
  onClose?: () => void;
  isDrawerOpen?: boolean;
}

export function AccountBadge({ onClose, isDrawerOpen }: AccountBadgeProps) {
  const user = useQuery(api.users.current);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuHeight = React.useRef(new Animated.Value(0)).current;
  const menuOpacity = React.useRef(new Animated.Value(0)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  // Reset menu state when drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      // Immediately reset all animated values and state when drawer closes
      menuHeight.setValue(0);
      menuOpacity.setValue(0);
      rotateAnim.setValue(0);
      setIsMenuOpen(false);
    }
  }, [isDrawerOpen, menuHeight, menuOpacity, rotateAnim]);

  const toggleMenu = useCallback(() => {
    const toValue = isMenuOpen ? 0 : 1;
    setIsMenuOpen(!isMenuOpen);

    Animated.parallel([
      Animated.spring(menuHeight, {
        toValue: toValue * 120, // Height for menu items
        tension: 100,
        friction: 15,
        useNativeDriver: false,
      }),
      Animated.timing(menuOpacity, {
        toValue,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.spring(rotateAnim, {
        toValue,
        tension: 100,
        friction: 15,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isMenuOpen, menuHeight, menuOpacity, rotateAnim]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      onClose?.();
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  const handleManageAccount = useCallback(() => {
    // Close the drawer first, then navigate to account screen
    onClose?.();
    // Small delay to let the drawer close animation start
    setTimeout(() => {
      router.push('/account');
    }, 100);
  }, [onClose, router]);

  if (user === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (user === null) {
    return null;
  }

  // Parse name parts from user.name
  const nameParts = (user.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Get user initials for fallback avatar
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    const email = user.email || '';
    return email.slice(0, 2).toUpperCase();
  };

  const displayName = user.name || 'User';
  const email = user.email || '';

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      {/* Main badge - always visible */}
      <TouchableOpacity
        style={[styles.badge, isMenuOpen && styles.badgeActive]}
        onPress={toggleMenu}
        activeOpacity={0.8}
        accessibilityLabel={`Account menu for ${displayName}, ${isMenuOpen ? 'expanded' : 'collapsed'}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isMenuOpen }}
        accessibilityHint="Double tap to expand account options"
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
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
          {/* Online indicator */}
          <View style={styles.onlineIndicator} />
        </View>

        {/* User info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {email}
          </Text>
        </View>

        {/* Expand/collapse chevron */}
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons name="chevron-up" size={18} color={Colors.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      {/* Expandable menu */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            height: menuHeight,
            opacity: menuOpacity,
          },
        ]}
      >
        <View style={styles.menuContent}>
          {/* Manage Account button */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleManageAccount}
            activeOpacity={0.7}
            accessibilityLabel="Manage Account"
            accessibilityRole="button"
            accessibilityHint="Opens account settings page"
          >
            <View style={styles.menuItemIcon}>
              <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.menuItemText}>Manage Account</Text>
            <Ionicons name="open-outline" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Sign Out button */}
          <TouchableOpacity
            style={[styles.menuItem, styles.signOutItem]}
            onPress={handleSignOut}
            activeOpacity={0.7}
            disabled={isSigningOut}
            accessibilityLabel={isSigningOut ? 'Signing out' : 'Sign Out'}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut }}
            accessibilityHint="Signs you out of the app"
          >
            <View style={[styles.menuItemIcon, styles.signOutIcon]}>
              {isSigningOut ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              )}
            </View>
            <Text style={[styles.menuItemText, styles.signOutText]}>
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  loadingContainer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
  },
  badgeActive: {
    backgroundColor: Colors.primaryAlpha10,
    borderColor: Colors.primaryAlpha20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.bgSurface,
  },
  userInfo: {
    flex: 1,
    minWidth: 0, // Enables text truncation
  },
  userName: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  menuContainer: {
    overflow: 'hidden',
  },
  menuContent: {
    paddingTop: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.md,
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
    marginHorizontal: Spacing.md,
  },
  signOutItem: {
    marginTop: Spacing.xs,
  },
  signOutIcon: {
    backgroundColor: Colors.error + '15',
  },
  signOutText: {
    color: Colors.error,
  },
});
