/**
 * Remedy Detail Screen
 * Displays full materia medica entry with formatted sections
 */

import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { parseRemedyBody, useMateriaMedica } from '@/hooks/useMateriaMedica';
import type { ParsedRemedy, RemedySection } from '@/types/materia-medica';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SectionCardProps {
  section: RemedySection;
  isLast: boolean;
}

const SectionCard = React.memo(function SectionCard({ section, isLast }: SectionCardProps) {
  // Map common section titles to icons
  const getIconForSection = (title: string): keyof typeof Ionicons.glyphMap => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('head')) return 'medical';
    if (lowerTitle.includes('mind')) return 'bulb';
    if (lowerTitle.includes('eye')) return 'eye';
    if (lowerTitle.includes('ear')) return 'ear';
    if (lowerTitle.includes('nose')) return 'water';
    if (lowerTitle.includes('face')) return 'happy';
    if (lowerTitle.includes('mouth') || lowerTitle.includes('throat')) return 'chatbubble';
    if (lowerTitle.includes('stomach') || lowerTitle.includes('abdomen')) return 'restaurant';
    if (lowerTitle.includes('stool') || lowerTitle.includes('rect')) return 'arrow-down';
    if (lowerTitle.includes('urinary') || lowerTitle.includes('urin')) return 'water-outline';
    if (lowerTitle.includes('male') || lowerTitle.includes('female')) return 'person';
    if (lowerTitle.includes('respiratory') || lowerTitle.includes('chest') || lowerTitle.includes('cough')) return 'cloud';
    if (lowerTitle.includes('heart')) return 'heart';
    if (lowerTitle.includes('back') || lowerTitle.includes('extrem') || lowerTitle.includes('limb')) return 'body';
    if (lowerTitle.includes('skin')) return 'hand-left';
    if (lowerTitle.includes('sleep')) return 'moon';
    if (lowerTitle.includes('fever') || lowerTitle.includes('chill')) return 'thermometer';
    if (lowerTitle.includes('modalities') || lowerTitle.includes('better') || lowerTitle.includes('worse')) return 'swap-horizontal';
    if (lowerTitle.includes('dose') || lowerTitle.includes('relationship')) return 'flask';
    if (lowerTitle.includes('general')) return 'apps';
    return 'document-text';
  };

  return (
    <View style={[styles.sectionCard, isLast && styles.sectionCardLast]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Ionicons
            name={getIconForSection(section.title)}
            size={18}
            color={Colors.primary}
          />
        </View>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <Text style={styles.sectionContent}>{section.content}</Text>
    </View>
  );
});

export default function RemedyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const { getRemedyById } = useMateriaMedica();
  
  const [isLoading, setIsLoading] = useState(true);
  const [parsedRemedy, setParsedRemedy] = useState<ParsedRemedy | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load remedy data
  useEffect(() => {
    const loadRemedy = () => {
      try {
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          setError('Invalid remedy ID');
          setIsLoading(false);
          return;
        }

        const remedy = getRemedyById(id);
        if (!remedy) {
          setError('Remedy not found');
          setIsLoading(false);
          return;
        }

        const parsed = parseRemedyBody(remedy.remedy_name, remedy.body_text);
        setParsedRemedy(parsed);
        setIsLoading(false);
      } catch (err) {
        console.error('[RemedyDetail] Error loading remedy:', err);
        setError(err instanceof Error ? err.message : 'Failed to load remedy');
        setIsLoading(false);
      }
    };

    loadRemedy();
  }, [params.id, getRemedyById]);

  // Format display name
  const displayName = useMemo(() => {
    if (parsedRemedy) {
      return parsedRemedy.name.replace(/_/g, ' ');
    }
    if (params.name) {
      return params.name.replace(/_/g, ' ');
    }
    return 'Remedy';
  }, [parsedRemedy, params.name]);

  // Handle share
  const handleShare = async () => {
    if (!parsedRemedy) return;
    
    try {
      const shareText = `${displayName}\n\n${parsedRemedy.introduction}\n\n` +
        parsedRemedy.sections.map(s => `${s.title}:\n${s.content}`).join('\n\n');
      
      await Share.share({
        message: shareText,
        title: displayName,
      });
    } catch (err) {
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Loading...
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading remedy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !parsedRemedy) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Error
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Remedy</Text>
          <Text style={styles.errorText}>{error || 'An unknown error occurred'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Remedy Detail
          </Text>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.7}
          accessibilityLabel="Share remedy"
          accessibilityRole="button"
        >
          <Ionicons name="share-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="leaf" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.remedyName}>{displayName}</Text>
        </View>

        {/* Introduction */}
        {parsedRemedy.introduction && (
          <View style={styles.introductionCard}>
            <View style={styles.introductionHeader}>
              <Ionicons name="information-circle" size={20} color={Colors.primary} />
              <Text style={styles.introductionTitle}>Overview</Text>
            </View>
            <Text style={styles.introductionText}>{parsedRemedy.introduction}</Text>
          </View>
        )}

        {/* Sections */}
        {parsedRemedy.sections.length > 0 && (
          <View style={styles.sectionsContainer}>
            <Text style={styles.sectionsTitle}>Symptoms & Indications</Text>
            {parsedRemedy.sections.map((section, index) => (
              <SectionCard
                key={`${section.title}-${index}`}
                section={section}
                isLast={index === parsedRemedy.sections.length - 1}
              />
            ))}
          </View>
        )}

        {/* Footer spacer */}
        <View style={styles.footerSpacer} />
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
    ...Shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryAlpha10,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    maxWidth: 200,
  },
  headerSpacer: {
    width: 40,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  retryButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['2xl'],
  },
  heroSection: {
    backgroundColor: Colors.bgSurface,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  remedyName: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    lineHeight: Typography['2xl'] * Typography.tight,
  },
  introductionCard: {
    backgroundColor: Colors.bgSurface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  introductionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  introductionTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  introductionText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
    lineHeight: Typography.base * Typography.relaxed,
    padding: Spacing.md,
  },
  sectionsContainer: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionsTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  sectionCardLast: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  sectionContent: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
    lineHeight: Typography.base * Typography.relaxed,
    padding: Spacing.md,
  },
  footerSpacer: {
    height: Spacing['2xl'],
  },
});
