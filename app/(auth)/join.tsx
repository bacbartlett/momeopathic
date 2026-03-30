import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webMaxWidth, WEB_FORM_MAX_WIDTH } from '@/lib/web-styles';

const CIRCLE_URL = 'https://paolabrown.com/circle/';

export default function JoinScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Members Only</Text>
          <Text style={styles.subtitle}>
            This app is exclusively for members of the{' '}
            <Text style={styles.highlight}>Momeopath's Insider Circle</Text>.
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardText}>
            The Momeopath's Insider Circle is a community where you can learn to
            confidently use homeopathy for your family's acute care needs, with
            guidance and support every step of the way.
          </Text>
          <Text style={styles.cardText}>
            As a member, you'll get full access to this app, including
            personalized AI-powered remedy recommendations and the complete
            Boericke's Materia Medica.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => Linking.openURL(CIRCLE_URL)}
          activeOpacity={0.7}
        >
          <Text style={styles.joinButtonText}>Learn More & Join</Text>
          <Ionicons name="open-outline" size={18} color={Colors.textInverse} />
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    ...webMaxWidth(WEB_FORM_MAX_WIDTH),
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['3xl'],
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * 1.5,
    paddingHorizontal: Spacing.md,
  },
  highlight: {
    fontFamily: Fonts?.bodyMedium ?? 'System',
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing['2xl'],
    gap: Spacing.md,
    ...Shadows.sm,
  },
  cardText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.sm * 1.6,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  joinButtonText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  backButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
});
