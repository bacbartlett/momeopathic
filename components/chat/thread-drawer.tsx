import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useChat } from '@/context/chat-context';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountBadge } from './account-badge';
import { ThreadItem } from './thread-item';

const DRAWER_WIDTH = 320;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadDrawer({ isOpen, onClose }: ThreadDrawerProps) {
  const { state, activeThread, createThread, selectThread, deleteThread } = useChat();
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // Show immediately, then animate in
      setIsVisible(true);
      translateX.value = withSpring(0, {
        overshootClamping: false,
        damping: 75,
        stiffness: 250,
      });
      overlayOpacity.value = withTiming(1, { duration: 250 });
    } else {
      // Animate out, then hide
      translateX.value = withTiming(-DRAWER_WIDTH, { duration: 200 });
      overlayOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setIsVisible)(false);
        }
      });
    }
  }, [isOpen]);

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

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
    <View style={styles.container}>
      {/* Overlay that blocks ALL touches and closes drawer when tapped */}
      <Pressable 
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      >
        <Animated.View 
          style={[styles.overlay, StyleSheet.absoluteFill, overlayAnimatedStyle]} 
        />
      </Pressable>
      
      {/* Drawer - positioned on the left, captures all touches within its bounds */}
      <Animated.View 
        style={[styles.drawer, drawerAnimatedStyle]}
      >
        <View style={styles.drawerTouchBlocker}>
          <SafeAreaView style={styles.safeArea}>
          {/* Header with branding */}
          <View style={styles.header}>
            <View style={styles.headerBranding}>
              <View style={styles.logoContainer}>
                <Ionicons name="leaf" size={24} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.brandTitle}>My Materia</Text>
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

          {/* Account badge */}
          <View style={styles.footer}>
            <AccountBadge onClose={onClose} isDrawerOpen={isOpen} />
          </View>
        </SafeAreaView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  overlay: {
    backgroundColor: 'rgba(61, 57, 53, 0.4)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 1001,
    elevation: 1001,
  },
  drawerTouchBlocker: {
    flex: 1,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
