/**
 * Materia Medica Layout
 * Handles navigation for the materia medica section
 */

import { Colors, Fonts, Typography } from '@/constants/theme';
import { Stack } from 'expo-router';
import React from 'react';

export default function MateriaMedicaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bgPrimary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="[id]" 
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
