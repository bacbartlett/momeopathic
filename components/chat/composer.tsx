import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export interface ComposerHandle {
  blur: () => void;
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(({
  onSend,
  disabled = false,
  containerStyle,
}, ref) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const textRef = useRef(text);

  // Flag: when true, the next onChangeText call is from an Enter keypress
  // and should be swallowed (prevents the newline from being inserted).
  const enterPressedRef = useRef(false);

  // Keep textRef in sync with text state
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Expose blur method via ref
  useImperativeHandle(ref, () => ({
    blur: () => {
      inputRef.current?.blur();
    },
  }));

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = textRef.current.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText('');
    }
  }, [disabled, onSend]);

  // Intercept Enter key on web via onKeyPress (works with multiline TextInput).
  // We set a flag so the subsequent onChangeText can swallow the inserted newline.
  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string; shiftKey?: boolean } }) => {
      if (Platform.OS !== 'web') return;
      // shiftKey may not be in the RN type, but react-native-web forwards it
      const shiftKey = (e.nativeEvent as { shiftKey?: boolean }).shiftKey;
      if (e.nativeEvent.key === 'Enter' && !shiftKey) {
        enterPressedRef.current = true;
        handleSend();
      }
    },
    [handleSend],
  );

  const handleChangeText = useCallback((newText: string) => {
    if (enterPressedRef.current) {
      // Swallow the newline that Enter inserted
      enterPressedRef.current = false;
      return;
    }
    setText(newText);
  }, []);

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={[styles.outerContainer, containerStyle]}>
      {/* Fade mask above the composer */}
      <LinearGradient
        colors={['transparent', ChatColors.background]}
        style={styles.fadeMask}
        pointerEvents="none"
      />

      {/* Solid backdrop so messages are fully hidden behind the input + disclaimer */}
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type your symptom or question..."
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyPress={handleKeyPress}
              multiline
              maxLength={4000}
              editable={!disabled}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, canSend && styles.sendButtonActive]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
              accessibilityLabel="Send message"
              accessibilityRole="button"
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={canSend ? Colors.textInverse : Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimer text - Fixed size to prevent layout issues */}
        <View style={[
          styles.disclaimerContainer,
          { paddingBottom: isFocused ? Spacing.xs : Spacing.sm }
        ]}>
          <Ionicons name="information-circle-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            AI advice should complement professional medical guidance.
          </Text>
        </View>
      </View>
    </View>
  );
});

Composer.displayName = 'Composer';

const styles = StyleSheet.create({
  outerContainer: {
    // Transparent outer wrapper — the gradient + floating pill sit on top of chat background
    backgroundColor: 'transparent',
  },
  fadeMask: {
    height: 80,
  },
  backdrop: {
    backgroundColor: ChatColors.background,
  },
  container: {
    paddingHorizontal: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 52,
    ...Shadows.md,
  },
  input: {
    flex: 1,
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
    maxHeight: 120,
    paddingVertical: Spacing.sm,
    lineHeight: Typography.base * Typography.leading,
    // Remove the default browser focus outline (the "black box" on web)
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- outlineStyle is web-only
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
    ...Shadows.glow,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  disclaimerText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: 12, // Fixed size - does not scale with accessibility settings to prevent layout issues
    color: Colors.textMuted,
  },
});
