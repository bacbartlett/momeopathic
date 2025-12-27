import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ChatProvider } from '@/context/chat-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Custom dark theme matching our chat colors
const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0D0D0F',
    card: '#141416',
    border: '#27272A',
    text: '#EAEAEC',
    primary: '#2563EB',
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={customDarkTheme}>
      <ChatProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </ChatProvider>
    </ThemeProvider>
  );
}
