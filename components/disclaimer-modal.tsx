import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const DISCLAIMER_AGREED_KEY = 'disclaimer_agreed';
const SCREEN_HEIGHT = Dimensions.get('window').height;

const SUMMARY_TEXT = `IMPORTANT DISCLAIMER

Summary View:

This AI chatbot helps you explore Boericke's Materia Medica through conversation - it's an educational tool, not medical advice.

Important:

• AI can make mistakes and provide inaccurate information
• This is not a substitute for professional healthcare
• Always consult qualified healthcare providers for health concerns
• Not for diagnosing, treating, or curing any condition
• You assume full responsibility for any actions you take
• For educational purposes only. 18+ or parental permission required.

By continuing, you agree to these terms.`;

const FULL_TEXT = `Welcome to the Homeopathic Materia Medica Chat

Before you begin, please read and agree to the following:

What This Tool Is

This is an educational resource that makes William Boericke's Materia Medica more accessible through a conversational interface. It uses AI to help you explore homeopathic remedies described in classical texts.

What This Tool Is NOT

• Not a doctor or healthcare provider
• Not medical advice, diagnosis, or treatment
• Not a substitute for professional medical care
• Not authoritative - it's a learning tool based on historical texts

Important Limitations

AI makes mistakes. This chatbot can misunderstand symptoms, provide inaccurate information, or suggest inappropriate remedies. The information provided may be incomplete, outdated, or incorrect.

Always consult qualified healthcare professionals for any health concerns. If you have a medical emergency, contact emergency services immediately.

Your Responsibility

By using this tool, you acknowledge that:

• You understand this is for educational exploration only
• You will not rely on this as medical advice
• You assume full responsibility for any actions you take based on information provided
• You will consult appropriate healthcare providers before using any remedies
• You are 18 years or older (or have parental permission)

No Warranty

This service is provided "as is" without any warranties. We make no guarantees about accuracy, completeness, or fitness for any particular purpose.

By clicking "I Understand and Agree," you acknowledge that you have read and accept these terms.`;

interface DisclaimerModalProps {
  visible: boolean;
  onAgree: () => void;
  allowDismiss?: boolean; // If true, allows closing without agreeing (for viewing from account page)
}

export function DisclaimerModal({ visible, onAgree, allowDismiss = false }: DisclaimerModalProps) {
  const [isFullText, setIsFullText] = useState(false);
  const acceptDisclaimer = useMutation(api.users.acceptDisclaimer);

  const handleAgree = async () => {
    try {
      // Save to AsyncStorage as fallback
      await AsyncStorage.setItem(DISCLAIMER_AGREED_KEY, 'true');
      
      // Save to database if user is authenticated
      try {
        await acceptDisclaimer();
      } catch (dbError) {
        // If user is not authenticated, that's okay - AsyncStorage will handle it
        // Only log if it's not an auth error
        if (dbError instanceof Error && !dbError.message.includes('authentication')) {
          console.error('Failed to save disclaimer to database:', dbError);
        }
      }
      
      onAgree();
    } catch (error) {
      console.error('Failed to save disclaimer agreement:', error);
      // Still call onAgree even if storage fails
      onAgree();
    }
  };

  const handleDismiss = () => {
    if (allowDismiss) {
      onAgree(); // Just close the modal without saving
    }
  };

  const textToDisplay = isFullText ? FULL_TEXT : SUMMARY_TEXT;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={allowDismiss ? handleDismiss : () => {}} // Allow closing if dismiss is allowed
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.overlayPressable}
          onPress={allowDismiss ? handleDismiss : undefined}
        />
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={32} color={Colors.error} />
            </View>
            <Text style={styles.title}>IMPORTANT DISCLAIMER</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <Text style={styles.contentText}>{textToDisplay}</Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setIsFullText(!isFullText)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFullText ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.toggleText}>
                {isFullText ? 'Show Summary' : 'Show Full Text'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.agreeButton}
              onPress={handleAgree}
              activeOpacity={0.8}
            >
              <Text style={styles.agreeButtonText}>I Understand and Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export async function hasAgreedToDisclaimer(): Promise<boolean> {
  try {
    const agreed = await AsyncStorage.getItem(DISCLAIMER_AGREED_KEY);
    return agreed === 'true';
  } catch (error) {
    console.error('Failed to check disclaimer agreement:', error);
    return false;
  }
}

/**
 * Hook to check if the user has accepted the disclaimer.
 * Checks both the database (if authenticated) and AsyncStorage.
 */
export function useHasAcceptedDisclaimer() {
  const dbAccepted = useQuery(api.users.hasAcceptedDisclaimer);
  const [localAccepted, setLocalAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    // Check AsyncStorage
    AsyncStorage.getItem(DISCLAIMER_AGREED_KEY)
      .then((value) => {
        setLocalAccepted(value === 'true');
      })
      .catch(() => {
        setLocalAccepted(false);
      });
  }, []);

  // Sync database status to AsyncStorage if database says accepted but local doesn't
  useEffect(() => {
    if (dbAccepted === true && localAccepted === false) {
      AsyncStorage.setItem(DISCLAIMER_AGREED_KEY, 'true').catch(() => {
        // Ignore errors
      });
      setLocalAccepted(true);
    }
  }, [dbAccepted, localAccepted]);

  // If database says accepted, return true
  // Otherwise, check local storage
  // If either is true, user has accepted
  if (dbAccepted === true) {
    return true;
  }
  
  // If dbAccepted is false or null, check local storage
  if (localAccepted === true) {
    return true;
  }

  // If we're still loading, return null to indicate loading state
  if (dbAccepted === undefined || localAccepted === null) {
    return null;
  }

  return false;
}

/**
 * Component that manages the disclaimer modal visibility based on database and local storage.
 * Should be rendered inside ConvexProviderWithClerk.
 */
export function DisclaimerManager() {
  const hasAccepted = useHasAcceptedDisclaimer();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Once we know the status, show disclaimer if not accepted
    if (hasAccepted !== null) {
      setShowDisclaimer(!hasAccepted);
      setInitialized(true);
    }
  }, [hasAccepted]);

  const handleAgree = () => {
    setShowDisclaimer(false);
  };

  // Don't render until we've checked the status
  if (!initialized) {
    return null;
  }

  return <DisclaimerModal visible={showDisclaimer} onAgree={handleAgree} />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 57, 53, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    ...Shadows.lg,
    overflow: 'hidden',
    flexDirection: 'column',
    zIndex: 1,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
    flexShrink: 0,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts?.headingBold ?? 'System',
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: '#3D3935', // Explicit color to ensure visibility
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.5,
    minHeight: 200,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  contentText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    lineHeight: Typography.base * Typography.relaxed,
    color: '#3D3935', // Explicit color to ensure visibility
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  toggleText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
  agreeButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  agreeButtonText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
});
