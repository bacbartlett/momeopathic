import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';

interface TrialIndicatorProps {
  trialDaysRemaining: number;
  onPress?: () => void;
}

export function TrialIndicator({ trialDaysRemaining, onPress }: TrialIndicatorProps) {
  const label = `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left`;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`${label} in trial`}
      accessibilityRole="button"
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: Colors.primaryAlpha20,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  text: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
});
