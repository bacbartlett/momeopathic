import { Composer } from '@/components/chat/composer';
import { MessageList } from '@/components/chat/message-list';
import { ThreadDrawer } from '@/components/chat/thread-drawer';
import { ChatColors } from '@/constants/theme';
import { useChat } from '@/context/chat-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { state, activeThread, isLoading, createThread, sendMessage } = useChat();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Create initial thread if none exists
  useEffect(() => {
    if (!isLoading && state.threads.length === 0) {
      createThread();
    }
  }, [isLoading, state.threads.length, createThread]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ChatColors.accent} />
      </View>
    );
  }

  const content = (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsDrawerOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={ChatColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {activeThread?.title ?? 'New Chat'}
        </Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={createThread}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={24} color={ChatColors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.messagesContainer}>
        <MessageList messages={activeThread?.messages ?? []} />
      </View>

      <Composer onSend={sendMessage} disabled={!activeThread} />
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {Platform.OS === 'ios' || Platform.OS === 'android' ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior='padding'
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.keyboardAvoidingView}>{content}</View>
      )}

      <ThreadDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ChatColors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ChatColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ChatColors.border,
    backgroundColor: ChatColors.headerBackground,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: ChatColors.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  newChatButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  messagesContainer: {
    flex: 1,
  },
});
