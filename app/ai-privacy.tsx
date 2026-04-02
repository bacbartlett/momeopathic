import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
// import { usePostHogAnalytics } from '@/context/posthog-context';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function InfoCard({ icon, title, children }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>
        {children}
      </View>
    </View>
  );
}

function ExternalLink({ url, label }: { url: string; label: string }) {
  return (
    <TouchableOpacity
      style={styles.externalLink}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.7}
    >
      <Ionicons name="open-outline" size={16} color={Colors.primary} />
      <Text style={styles.externalLinkText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AiPrivacyScreen() {
  const router = useRouter();
  // const { track } = usePostHogAnalytics();
  const aiConsent = useQuery(api.users.getAiConsentStatus);

  useEffect(() => {
    // track('AI Privacy Page Viewed');
  }, []);

  const consentDate = aiConsent?.timestamp
    ? new Date(aiConsent.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI & Privacy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="leaf" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.introTitle}>How Rosemary works</Text>
          <Text style={styles.introText}>
            Here's a clear picture of what happens when you chat with me, what data is involved, and who processes it.
          </Text>
        </View>

        {/* How recommendations work */}
        <InfoCard icon="search-outline" title="How recommendations work">
          <Text style={styles.bodyText}>
            When you describe symptoms or ask about remedies, Rosemary searches through Boericke's Materia Medica — a comprehensive, classic homeopathic reference text published in 1927. AI is used to match your description to the most relevant remedies in this reference material.
          </Text>
          <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
            All advice is grounded in this reference text, not generic AI responses. Rosemary will cite specific remedies and their indications from Boericke's.
          </Text>
        </InfoCard>

        {/* AI Provider */}
        <InfoCard icon="hardware-chip-outline" title="Which AI processes your messages">
          <Text style={styles.bodyText}>
            Your messages are processed by <Text style={styles.bold}>Anthropic's Claude</Text> (an AI language model), accessed through <Text style={styles.bold}>OpenRouter</Text> (a routing service).
          </Text>
          <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
            These services process your messages in real time to generate responses. They do not permanently store your conversations in a way tied to your identity.
          </Text>
        </InfoCard>

        {/* What data is sent */}
        <InfoCard icon="paper-plane-outline" title="What data is sent">
          <Text style={styles.bodyText}>
            <Text style={styles.bold}>Sent to the AI:</Text>
          </Text>
          <Text style={styles.bulletItem}>Your chat messages (what you type in the conversation)</Text>
          <Text style={styles.bulletItem}>If you share your name in conversation, that would be included in the message</Text>
          <Text style={styles.bulletItem}>Relevant excerpts from Boericke's Materia Medica (for context)</Text>

          <Text style={[styles.bodyText, { marginTop: Spacing.md }]}>
            <Text style={styles.bold}>NOT sent to the AI:</Text>
          </Text>
          <Text style={styles.bulletItem}>Your email address</Text>
          <Text style={styles.bulletItem}>Your device information</Text>
          <Text style={styles.bulletItem}>Your location</Text>
          <Text style={styles.bulletItem}>Any data beyond what you type in the chat</Text>
        </InfoCard>

        {/* Privacy policies */}
        <InfoCard icon="shield-checkmark-outline" title="Third-party privacy policies">
          <Text style={styles.bodyText}>
            You can review how these services handle data:
          </Text>
          <View style={styles.linksContainer}>
            <ExternalLink
              url="https://www.anthropic.com/privacy"
              label="Anthropic Privacy Policy"
            />
            <ExternalLink
              url="https://openrouter.ai/privacy"
              label="OpenRouter Privacy Policy"
            />
          </View>
        </InfoCard>

        {/* Consent status */}
        {consentDate && (
          <InfoCard icon="checkmark-circle-outline" title="Your consent">
            <Text style={styles.bodyText}>
              You gave consent to AI data processing on <Text style={styles.bold}>{consentDate}</Text>.
            </Text>
            <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
              If we change AI providers or how your data is processed, we'll ask for your consent again before sending any new messages.
            </Text>
          </InfoCard>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Questions? Reach out at brandon@brandonb.dev
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['2xl'],
  },
  intro: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  introTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  introText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    lineHeight: Typography.base * 1.5,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.bgSecondary,
  },
  cardTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardBody: {
    padding: Spacing.md,
  },
  bodyText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    lineHeight: Typography.base * 1.5,
    color: Colors.textPrimary,
  },
  bold: {
    fontWeight: '600',
  },
  bulletItem: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    lineHeight: Typography.base * 1.5,
    color: Colors.textPrimary,
    paddingLeft: Spacing.md,
    marginTop: Spacing.xs,
  },
  linksContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  externalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryAlpha10,
    borderRadius: Radius.md,
  },
  externalLinkText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.primary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
