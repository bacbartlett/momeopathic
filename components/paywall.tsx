import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useMixpanel } from '@/context/mixpanel-context';
import { useRevenueCat } from '@/context/revenue-cat-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={24} color={Colors.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

interface PackageCardProps {
  pkg: PurchasesPackage;
  isSelected: boolean;
  onSelect: () => void;
  isBestValue?: boolean;
}

function PackageCard({ pkg, isSelected, onSelect, isBestValue }: PackageCardProps) {
  const product = pkg.product;
  
  // Determine period label
  let periodLabel = '';
  let pricePerPeriod = '';

  if (product.subscriptionPeriod) {
    const period = product.subscriptionPeriod;
    if (period.includes('P1M') || period === 'P1M') {
      periodLabel = 'Monthly';
      pricePerPeriod = '/month';
    } else if (period.includes('P1Y') || period === 'P1Y') {
      periodLabel = 'Yearly';
      pricePerPeriod = '/year';
    } else if (period.includes('P1W') || period === 'P1W') {
      periodLabel = 'Weekly';
      pricePerPeriod = '/week';
    }
  } else {
    // No subscription period means it's a lifetime purchase
    periodLabel = 'Lifetime';
    pricePerPeriod = '/account';
  }

  return (
    <TouchableOpacity
      style={[
        styles.packageCard,
        isSelected && styles.packageCardSelected,
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {isBestValue && (
        <View style={styles.bestValueBadge}>
          <Text style={styles.bestValueText}>Most Popular</Text>
        </View>
      )}
      <View style={styles.packageHeader}>
        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
        <Text style={styles.packagePeriod}>{periodLabel}</Text>
      </View>
      <View style={styles.packagePricing}>
        <Text style={styles.packagePrice}>{stripCents(product.priceString)}</Text>
        <Text style={styles.packagePricePeriod}>{pricePerPeriod}</Text>
      </View>
    </TouchableOpacity>
  );
}

const stripCents = (t: string): string => {
  // If the last 3 chars are .00, strip them off
  if (t.endsWith('.00')) {
    return t.slice(0, -3);
  }
  return t;
}

export function Paywall() {
  const {
    currentOffering,
    purchasePackage,
    restorePurchases,
    isLoading,
    error,
    isInitialized,
  } = useRevenueCat();
  const { track, setUserProperties } = useMixpanel();
  
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Don't show paywall if RevenueCat is not initialized (e.g., dev mode without API key)
  if (!isInitialized) {
    return null;
  }

  // Track paywall viewed
  useEffect(() => {
    track('Paywall Viewed');
  }, [track]);

  // Get available packages
  const packages = currentOffering?.availablePackages ?? [];
  
  // Auto-select first package if none selected
  React.useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      // Prefer yearly package if available
      const yearlyPkg = packages.find(p => 
        p.product.subscriptionPeriod?.includes('P1Y')
      );
      setSelectedPackage(yearlyPkg ?? packages[0]);
    }
  }, [packages, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    
    setIsPurchasing(true);
    setLocalError(null);
    
    try {
      const success = await purchasePackage(selectedPackage);
      if (success) {
        track('Subscription Started', { 
          package_id: selectedPackage.identifier,
          price: selectedPackage.product.priceString,
          period: selectedPackage.product.subscriptionPeriod ?? 'lifetime',
        });
        setUserProperties({ subscription_status: 'premium' });
      } else {
        // User cancelled
        track('Paywall Dismissed', { reason: 'cancelled' });
      }
    } catch {
      setLocalError('Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setLocalError(null);
    
    try {
      const success = await restorePurchases();
      if (!success) {
        setLocalError('No active subscription found to restore.');
      }
    } catch {
      setLocalError('Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[Colors.primaryAlpha20, 'transparent']}
            style={styles.headerGradient}
          />
          <View style={styles.iconContainer}>
            <Ionicons name="leaf" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>My Materia</Text>
          <Text style={styles.subtitle}>
            Get unlimited access to your personal homeopathy assistant
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="chatbubbles"
            title="Unlimited Chat"
            description="Ask as many questions as you need about homeopathy"
          />
          <FeatureItem
            icon="library"
            title="Expert Knowledge"
            description="Access comprehensive homeopathic remedies and guidance"
          />
          <FeatureItem
            icon="heart"
            title="Family Wellness"
            description="Support your family's health naturally"
          />
          <FeatureItem
            icon="shield-checkmark"
            title="Safe & Private"
            description="Your conversations are secure and confidential"
          />
        </View>

        {/* Packages */}
        {isLoading && packages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading subscription options...</Text>
          </View>
        ) : packages.length > 0 ? (
          <View style={styles.packagesContainer}>
            {packages.map((pkg, index) => (
              <PackageCard
                key={pkg.identifier}
                pkg={pkg}
                isSelected={selectedPackage?.identifier === pkg.identifier}
                onSelect={() => setSelectedPackage(pkg)}
                isBestValue={pkg.product.subscriptionPeriod?.includes('P1Y')}
              />
            ))}
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>
              No subscription options available at this time.
            </Text>
          </View>
        )}

        {/* Error Display */}
        {displayError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (!selectedPackage || isPurchasing) && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!selectedPackage || isPurchasing}
          activeOpacity={0.8}
        >
          {isPurchasing ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <>
              <Text style={styles.purchaseButtonText}>Subscribe Now</Text>
              {selectedPackage && (
                <Text style={styles.purchaseButtonPrice}>
                  {selectedPackage.product.priceString}
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isRestoring}
          activeOpacity={0.7}
        >
          {isRestoring ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          Payment will be charged to your App Store or Google Play account. 
          Subscription automatically renews unless canceled at least 24 hours 
          before the end of the current period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.glow,
  },
  title: {
    fontFamily: Fonts?.headingBold ?? 'System',
    fontSize: Typography['3xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: width * 0.8,
    lineHeight: Typography.base * Typography.relaxed,
  },
  featuresContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.sm * Typography.normal,
  },
  packagesContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  packageCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
    ...Shadows.sm,
  },
  packageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryAlpha10,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  bestValueText: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  packagePeriod: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  packagePricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginLeft: 30,
  },
  packagePrice: {
    fontFamily: Fonts?.headingBold ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  packagePricePeriod: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: 'rgba(212, 132, 124, 0.1)',
    borderRadius: Radius.md,
  },
  errorText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.error,
    flex: 1,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  purchaseButtonDisabled: {
    backgroundColor: Colors.border,
  },
  purchaseButtonText: {
    fontFamily: Fonts?.headingBold ?? 'System',
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  purchaseButtonPrice: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textInverse,
    opacity: 0.9,
    marginTop: 2,
  },
  restoreButton: {
    alignSelf: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  restoreButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  termsText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    lineHeight: Typography.xs * Typography.relaxed,
  },
});
