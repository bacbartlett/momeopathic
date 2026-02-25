import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useRevenueCat } from '@/context/revenue-cat-context';

interface TrialLockoutModalProps {
  visible: boolean;
  onViewPlans: () => void;
  onMaybeLater: () => void;
}

export function TrialLockoutModal({
  visible,
  onViewPlans,
  onMaybeLater,
}: TrialLockoutModalProps) {
  const { currentOffering, purchasePackage } = useRevenueCat();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleSubscribe = async () => {
    if (!currentOffering || isPurchasing) {
      onViewPlans();
      return;
    }

    const monthlyPackage =
      currentOffering.monthly ??
      currentOffering.availablePackages.find((pkg) => pkg.packageType === 'MONTHLY');

    if (!monthlyPackage) {
      onViewPlans();
      return;
    }

    setIsPurchasing(true);
    try {
      await purchasePackage(monthlyPackage);
    } catch (error) {
      console.error('Failed to purchase monthly subscription:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayPressable} />
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Your Free Week Has Ended</Text>
          <Text style={styles.body}>
            We hope My Materia has been helpful! Subscribe to keep your homeopathy study partner
            available anytime.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, isPurchasing && styles.primaryButtonDisabled]}
            onPress={handleSubscribe}
            activeOpacity={0.8}
            disabled={isPurchasing}
          >
            <Text style={styles.primaryButtonText}>
              {isPurchasing ? 'Processing...' : 'Subscribe - $11.99/month'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onViewPlans} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>View Plans</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tertiaryButton} onPress={onMaybeLater} activeOpacity={0.7}>
            <Text style={styles.tertiaryButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 57, 53, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.xl,
    width: '100%',
    maxWidth: 500,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  title: {
    fontFamily: Fonts?.headingBold ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    lineHeight: Typography.base * Typography.relaxed,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
  secondaryButton: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
  },
  tertiaryButton: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
});
