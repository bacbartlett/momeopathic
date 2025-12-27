import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onFocus?: () => void;
}

export function Composer({ onSend, disabled = false, onFocus }: ComposerProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const textRef = useRef(text);

  // Keep textRef in sync with text state
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const handleSend = useCallback(() => {
    const trimmed = textRef.current.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText('');
    }
  }, [disabled, onSend]);

  // Handle Enter key on web
  useEffect(() => {
    if (Platform.OS !== 'web' || !inputRef.current) return;

    const input = inputRef.current as unknown as { _inputRef?: HTMLTextAreaElement };
    const htmlInput = input._inputRef;
    
    if (!htmlInput) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    htmlInput.addEventListener('keydown', handleKeyDown);
    return () => {
      htmlInput.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSend]);

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Ask about homeopathic remedies..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          onFocus={onFocus}
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
      
      {/* Disclaimer text */}
      <View style={styles.disclaimerContainer}>
        <Ionicons name="information-circle-outline" size={12} color={Colors.textMuted} />
        <Text style={styles.disclaimerText}>
          For educational purposes only. Always consult a healthcare provider.
        </Text>
      </View>
    </View>
  );
}

// Manual Text component since we're in a module
function Text({ style, children }: { style?: object; children: React.ReactNode }) {
  const RNText = require('react-native').Text;
  return <RNText style={style}>{children}</RNText>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: ChatColors.composerBackground,
    ...Shadows.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: ChatColors.inputBackground,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
    maxHeight: 120,
    paddingVertical: Spacing.sm,
    lineHeight: Typography.base * Typography.normal,
  },
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
    marginTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  disclaimerText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});
