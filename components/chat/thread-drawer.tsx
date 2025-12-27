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
import { ChatColors, Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const DRAWER_WIDTH = 320;
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
        Animated.spring(translateX, {
          toValue: 0,
          tension: 65,
          friction: 11,
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
          {/* Header with branding */}
          <View style={styles.header}>
            <View style={styles.headerBranding}>
              <View style={styles.logoContainer}>
                <Ionicons name="leaf" size={24} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.brandTitle}>Homeopathy Guide</Text>
                <Text style={styles.brandSubtitle}>Natural family wellness</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={handleNewChat}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Section title */}
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.sectionTitle}>Your Conversations</Text>
          </View>

          <ScrollView
            style={styles.threadList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.threadListContent}
          >
            {state.threads.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="chatbubbles-outline" size={40} color={Colors.primaryLight} />
                </View>
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap the + button to start exploring homeopathic remedies for your family
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

          {/* Footer with helpful info */}
          <View style={styles.footer}>
            <View style={styles.footerContent}>
              <Ionicons name="heart-outline" size={14} color={Colors.accent} />
              <Text style={styles.footerText}>Made with care for families</Text>
            </View>
          </View>
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
    backgroundColor: 'rgba(61, 57, 53, 0.4)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.bgSurface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    ...Shadows.lg,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  brandSubtitle: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryAlpha20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  threadList: {
    flex: 1,
  },
  threadListContent: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.sm * Typography.relaxed,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});
