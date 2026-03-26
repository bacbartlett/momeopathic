import { CURRENT_AI_CONSENT_VERSION } from "@/constants/ai-consent";
import {
  Colors,
  Fonts,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { usePostHogAnalytics } from "@/context/posthog-context";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaskedView from "@react-native-masked-view/masked-view";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const DISCLAIMER_AGREED_KEY = "disclaimer_agreed";
const SCREEN_HEIGHT = Dimensions.get("window").height;

const SUMMARY_TEXT_PARTS = {
  intro: `I'm here to help you explore homeopathic remedies from Boericke's Materia Medica — think of me as a study partner, not a doctor.

A few things worth knowing:

• I use Anthropic's AI (Claude) via OpenRouter to process your messages and match symptoms to remedies
• Only your chat messages are sent to these services — not your email, device info, or anything else
• I can get things wrong sometimes — always double-check what matters
• I'm for learning and exploring, not for medical advice
• For anything serious, please talk to a real healthcare provider
• You'll need to be 18+ (or have a parent's okay)

By continuing, you agree to our `,
  termsLink: "Terms and Conditions",
  and: " and ",
  privacyLink: "Privacy Policy",
  period: ".",
};

const FULL_TEXT_PARTS = {
  intro: `What I am:

I'm an educational tool that makes William Boericke's Materia Medica easier to explore through conversation. I use AI to help you learn about homeopathic remedies described in classical texts — like having a knowledgeable study partner available whenever you need one.

How I process your data:

Your chat messages are sent to Anthropic's Claude (an AI language model) through OpenRouter (an API routing service) to generate responses. Only what you type in the chat is sent — your email, device info, and account details are never shared with these services. These providers do not permanently store your conversations in a way tied to your identity. You can review their privacy policies at anthropic.com/privacy and openrouter.ai/privacy.

What I'm not:

• I'm not a doctor or healthcare provider
• Nothing I say is medical advice, diagnosis, or treatment
• I'm not a substitute for professional medical care
• I'm a learning tool based on historical texts — not an authority

I make mistakes:

I'm an AI, which means I can misunderstand symptoms, share inaccurate information, or suggest remedies that don't fit. What I share may be incomplete or incorrect. Please always double-check anything important.

For any real health concerns, talk to a qualified healthcare professional. In a medical emergency, contact emergency services right away.

By using me, you're agreeing that:

• This is for educational exploration only
• You won't rely on me as medical advice
• You take responsibility for any actions based on what I share
• You'll talk to a healthcare provider before using any remedies
• You're 18 or older (or have a parent's permission)

This service is provided as-is, without warranties of any kind. I can't guarantee accuracy, completeness, or fitness for any particular purpose.

By tapping "Got it, let's go!" you're confirming you've read and accept our `,
  termsLink: "Terms and Conditions",
  and: " and ",
  privacyLink: "Privacy Policy",
  period: ".",
};

interface DisclaimerModalProps {
  visible: boolean;
  onAgree: () => void;
  allowDismiss?: boolean; // If true, allows closing without agreeing (for viewing from account page)
}

export function DisclaimerModal({
  visible,
  onAgree,
  allowDismiss = false,
}: DisclaimerModalProps) {
  const [isFullText, setIsFullText] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const acceptDisclaimer = useMutation(api.users.acceptDisclaimer);
  const router = useRouter();
  const { track } = usePostHogAnalytics();

  // Track disclaimer viewed when modal becomes visible
  useEffect(() => {
    if (visible) {
      track("Disclaimer Viewed", { allow_dismiss: allowDismiss });
    }
  }, [visible, allowDismiss, track]);

  const handleAgree = async () => {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(DISCLAIMER_AGREED_KEY, "true");

      // Save to database
      try {
        if (isAuthenticated) {
          await acceptDisclaimer();
        }
      } catch (dbError) {
        console.error("Failed to save disclaimer to database:", dbError);
      }

      // Track disclaimer accepted (only when user clicks agree, not dismiss)
      if (!allowDismiss) {
        track("Disclaimer Accepted");
      }

      onAgree();
    } catch (error) {
      console.error("Failed to save disclaimer agreement:", error);
      // Still call onAgree even if storage fails
      onAgree();
    }
  };

  const handleDismiss = () => {
    if (allowDismiss) {
      onAgree(); // Just close the modal without saving
    }
  };

  const handleTermsPress = () => {
    router.push("/terms");
  };

  const handlePrivacyPress = () => {
    router.push("/privacy");
  };

  const renderTextWithLinks = (parts: typeof SUMMARY_TEXT_PARTS) => {
    return (
      <Text style={styles.contentText}>
        {parts.intro}
        <Text style={styles.linkText} onPress={handleTermsPress}>
          {parts.termsLink}
        </Text>
        {parts.and}
        <Text style={styles.linkText} onPress={handlePrivacyPress}>
          {parts.privacyLink}
        </Text>
        {parts.period}
      </Text>
    );
  };

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
            <MaskedView
              maskElement={<Text style={styles.title}>Hey, welcome! 👋</Text>}
            >
              <LinearGradient
                colors={[
                  Colors.primary,
                  Colors.primaryLight,
                  Colors.primaryDark,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.titleGradient}
              >
                <Text style={[styles.title, { opacity: 0 }]}>
                  Hey, welcome! 👋
                </Text>
              </LinearGradient>
            </MaskedView>
            {/* <Text style={styles.subTitle}>Let's get you set up.</Text> */}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            {isFullText
              ? renderTextWithLinks(FULL_TEXT_PARTS)
              : renderTextWithLinks(SUMMARY_TEXT_PARTS)}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setIsFullText(!isFullText)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFullText ? "chevron-up" : "chevron-down"}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.toggleText}>
                {isFullText ? "Show Summary" : "Show Full Text"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.agreeButton}
              onPress={handleAgree}
              activeOpacity={0.8}
            >
              <Text style={styles.agreeButtonText}>Got it, let's go!</Text>
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
    return agreed === "true";
  } catch (error) {
    console.error("Failed to check disclaimer agreement:", error);
    return false;
  }
}

/**
 * Hook to check if the user has accepted the disclaimer AND given current AI consent.
 * For authenticated users: checks database (source of truth) synced with AsyncStorage.
 * Returns false if AI consent version is outdated (triggers re-onboarding).
 */
export function useHasAcceptedDisclaimer() {
  const { isAuthenticated } = useConvexAuth();
  const dbAccepted = useQuery(api.users.hasAcceptedDisclaimer);
  const aiConsent = useQuery(api.users.getAiConsentStatus);
  const [localAccepted, setLocalAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    // Check AsyncStorage
    AsyncStorage.getItem(DISCLAIMER_AGREED_KEY)
      .then((value) => {
        setLocalAccepted(value === "true");
      })
      .catch(() => {
        setLocalAccepted(false);
      });
  }, []);

  // Compute derived values before hooks (React rules of hooks — no hooks after early returns)
  const disclaimerOk = dbAccepted === true || localAccepted === true;
  const aiConsentOk = aiConsent !== null && aiConsent !== undefined && aiConsent.version >= CURRENT_AI_CONSENT_VERSION;

  // Sync database status to AsyncStorage if database says accepted but local doesn't
  useEffect(() => {
    if (dbAccepted === true && localAccepted === false) {
      AsyncStorage.setItem(DISCLAIMER_AGREED_KEY, "true").catch(() => {
        // Ignore errors
      });
      setLocalAccepted(true);
    }
  }, [dbAccepted, localAccepted]);

  // Clear local cache when AI consent is outdated (so onboarding shows again)
  useEffect(() => {
    if (disclaimerOk && !aiConsentOk) {
      AsyncStorage.removeItem(DISCLAIMER_AGREED_KEY).catch(() => {});
    }
  }, [disclaimerOk, aiConsentOk]);

  // If not authenticated, return false
  if (!isAuthenticated) {
    return false;
  }

  // Still loading
  if (dbAccepted === undefined || aiConsent === undefined) {
    return null;
  }

  // Disclaimer must be accepted
  if (!disclaimerOk) {
    return false;
  }

  // AI consent must be current version
  if (!aiConsentOk) {
    return false;
  }

  return true;
}

/**
 * Component that manages the disclaimer modal visibility.
 * Shows for authenticated users.
 * Does not show on terms or privacy policy pages.
 */
export function DisclaimerManager() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const hasAccepted = useHasAcceptedDisclaimer();
  const pathname = usePathname();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Wait for auth state to be ready
    if (isAuthLoading) {
      return;
    }

    // If user is not authenticated, don't show disclaimer
    if (!isAuthenticated) {
      setShowDisclaimer(false);
      setInitialized(true);
      return;
    }

    // Don't show disclaimer on terms or privacy policy pages
    if (pathname === "/terms" || pathname === "/privacy") {
      setShowDisclaimer(false);
      setInitialized(true);
      return;
    }

    // User is authenticated - check if they've accepted
    if (hasAccepted === null) {
      // Still loading disclaimer status - keep modal hidden
      setShowDisclaimer(false);
      return;
    }

    setShowDisclaimer(!hasAccepted);
    setInitialized(true);
  }, [
    isAuthenticated,
    isAuthLoading,
    hasAccepted,
    pathname,
  ]);

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
    backgroundColor: "rgba(61, 57, 53, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  overlayPressable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.xl,
    width: "100%",
    maxWidth: 500,
    maxHeight: "85%",
    ...Shadows.lg,
    overflow: "hidden",
    flexDirection: "column",
    zIndex: 1,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: "center",
    flexShrink: 0,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts?.headingBold ?? "System",
    fontSize: Typography["3xl"],
    fontWeight: Typography.bold,
    color: "#3D3935", // Explicit color to ensure visibility
    textAlign: "center",
  },
  titleGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  subTitle: {
    fontFamily: Fonts?.headingBold ?? "System",
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: "#3D3935", // Explicit color to ensure visibility
    textAlign: "center",
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
    fontFamily: Fonts?.body ?? "System",
    fontSize: Typography.base,
    lineHeight: Typography.base * Typography.relaxed,
    color: "#3D3935", // Explicit color to ensure visibility
  },
  linkText: {
    color: Colors.primary,
    textDecorationLine: "underline",
    fontWeight: Typography.medium,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  toggleText: {
    fontFamily: Fonts?.body ?? "System",
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
  agreeButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    ...Shadows.sm,
  },
  agreeButtonText: {
    fontFamily: Fonts?.heading ?? "System",
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
});
