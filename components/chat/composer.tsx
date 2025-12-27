import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatColors } from '@/constants/theme';

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
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
          placeholder="Type a message..."
          placeholderTextColor={ChatColors.placeholder}
          value={text}
          onChangeText={setText}
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
            color={canSend ? ChatColors.sendButtonIcon : ChatColors.sendButtonIconDisabled}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: ChatColors.border,
    backgroundColor: ChatColors.composerBackground,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: ChatColors.inputBackground,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: ChatColors.text,
    maxHeight: 120,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ChatColors.sendButtonDisabled,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: ChatColors.sendButton,
  },
});
