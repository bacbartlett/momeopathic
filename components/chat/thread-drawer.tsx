import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '@/context/chat-context';
import { ThreadItem } from './thread-item';
import { ChatColors } from '@/constants/theme';

const DRAWER_WIDTH = 300;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadDrawer({ isOpen, onClose }: ThreadDrawerProps) {
  const { state, activeThread, createThread, selectThread, deleteThread } = useChat();
  const translateX = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // Show immediately, then animate in
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out, then hide
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
      });
    }
  }, [isOpen, translateX, overlayOpacity]);

  const handleNewChat = () => {
    createThread();
    onClose();
  };

  const handleSelectThread = (threadId: string) => {
    selectThread(threadId);
    onClose();
  };

  if (!isVisible && !isOpen) return null;

  return (
    <View style={styles.container} pointerEvents={isOpen ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Conversations</Text>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={handleNewChat}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color={ChatColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.threadList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.threadListContent}
          >
            {state.threads.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={ChatColors.textMuted} />
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start a new chat to begin
                </Text>
              </View>
            ) : (
              state.threads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === activeThread?.id}
                  onPress={() => handleSelectThread(thread.id)}
                  onDelete={() => deleteThread(thread.id)}
                />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: ChatColors.drawerBackground,
    borderRightWidth: 1,
    borderRightColor: ChatColors.border,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: ChatColors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ChatColors.text,
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ChatColors.drawerItemBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threadList: {
    flex: 1,
  },
  threadListContent: {
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ChatColors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: ChatColors.textMuted,
    textAlign: 'center',
  },
});

