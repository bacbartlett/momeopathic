import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface TrialStartModalProps {
  visible: boolean;
  onStartTrial: () => Promise<void>;
}

export function TrialStartModal({ visible, onStartTrial }: TrialStartModalProps) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    if (isStarting) {
      return;
    }
    setIsStarting(true);
    try {
      await onStartTrial();
    } catch (error) {
      console.error('Failed to start trial:', error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayPressable} />
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.body}>
            Hello, we&apos;re glad you&apos;re enjoying My Materia. The first week is on us. Try it
            out. We hope it helps you. After that, unlimited access for $11.99/month.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, isStarting && styles.primaryButtonDisabled]}
            onPress={handleStart}
            activeOpacity={0.8}
            disabled={isStarting}
          >
            <Text style={styles.primaryButtonText}>
              {isStarting ? 'Starting...' : 'Start My Free Week'}
            </Text>
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
});
