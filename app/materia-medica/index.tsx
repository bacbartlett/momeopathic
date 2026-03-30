/**
 * Materia Medica List Screen
 * Browse and search homeopathic remedies
 */

import { Colors, Fonts, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useRemediesList, type RemedyListItem } from '@/hooks/useMateriaMedica';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePostHogAnalytics } from '@/context/posthog-context';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webMaxWidth, WEB_LIST_MAX_WIDTH } from '@/lib/web-styles';

// Debounce delay in ms
const SEARCH_DEBOUNCE_MS = 300;

interface RemedyItemProps {
  item: RemedyListItem;
  onPress: () => void;
}

const RemedyItem = React.memo(function RemedyItem({ item, onPress }: RemedyItemProps) {
  // Format the remedy name for better display
  const displayName = item.remedy_name.replace(/_/g, ' ');
  
  // Get a preview of the body text (first 100 chars)
  const preview = useMemo(() => {
    const text = item.body_text.substring(0, 120);
    // Find the last space to avoid cutting words
    const lastSpace = text.lastIndexOf(' ');
    return lastSpace > 80 ? text.substring(0, lastSpace) + '...' : text + '...';
  }, [item.body_text]);

  return (
    <TouchableOpacity
      style={styles.remedyItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`Remedy: ${displayName}`}
      accessibilityRole="button"
      accessibilityHint="Tap to view remedy details"
    >
      <View style={styles.remedyItemContent}>
        <View style={styles.remedyIcon}>
          <Ionicons name="leaf" size={20} color={Colors.primary} />
        </View>
        <View style={styles.remedyTextContainer}>
          <Text style={styles.remedyName} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.remedyPreview} numberOfLines={2}>
            {preview}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
});

export default function MateriaMedicaListScreen() {
  const router = useRouter();
  const { track, incrementUserProperty } = usePostHogAnalytics();
  const {
    remedies,
    searchQuery,
    isSearching,
    totalCount,
    isFiltered,
    handleSearch,
    clearSearch,
  } = useRemediesList();

  const [inputValue, setInputValue] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTrackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Track page open
  useEffect(() => {
    track('Materia Medica Opened');
  }, [track]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(inputValue);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [inputValue, handleSearch]);

  // Track searches (debounced longer to capture final query)
  useEffect(() => {
    if (!inputValue.trim()) return;
    if (searchTrackRef.current) {
      clearTimeout(searchTrackRef.current);
    }
    searchTrackRef.current = setTimeout(() => {
      track('Remedy Searched', {
        query: inputValue.trim(),
        result_count: remedies.length,
      });
    }, 1000);
    return () => {
      if (searchTrackRef.current) {
        clearTimeout(searchTrackRef.current);
      }
    };
  }, [inputValue, remedies.length, track]);

  const handleClearSearch = useCallback(() => {
    setInputValue('');
    clearSearch();
    inputRef.current?.blur();
  }, [clearSearch]);

  const handleRemedyPress = useCallback((remedy: RemedyListItem) => {
    Keyboard.dismiss();
    track('Remedy Viewed', {
      remedy_id: remedy.id,
      remedy_name: remedy.remedy_name,
      source: isFiltered ? 'search' : 'browse',
    });
    incrementUserProperty('total_remedies_viewed');
    // Using type assertion for route as expo-router types are generated dynamically
    router.push({
      pathname: '/materia-medica/[id]' as '/account',
      params: { id: remedy.id, name: remedy.remedy_name },
    });
  }, [router, track, incrementUserProperty, isFiltered]);

  const renderItem = useCallback(({ item }: { item: RemedyListItem }) => (
    <RemedyItem
      item={item}
      onPress={() => handleRemedyPress(item)}
    />
  ), [handleRemedyPress]);

  const keyExtractor = useCallback((item: RemedyListItem) => item.id.toString(), []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      {isSearching ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : isFiltered ? (
        <>
          <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your search terms or browse all remedies
          </Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearSearch}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Ionicons name="leaf-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Remedies</Text>
          <Text style={styles.emptyText}>
            The materia medica database is empty
          </Text>
        </>
      )}
    </View>
  ), [isSearching, isFiltered, handleClearSearch]);

  const ListHeaderComponent = useMemo(() => (
    <View style={styles.headerStats}>
      <Text style={styles.statsText}>
        {isFiltered
          ? `${remedies.length} result${remedies.length !== 1 ? 's' : ''} found`
          : `${totalCount} remedies`
        }
      </Text>
    </View>
  ), [remedies.length, totalCount, isFiltered]);

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
          <Ionicons name="book" size={22} color={Colors.primary} />
          <Text style={styles.headerTitle}>Materia Medica</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search remedies..."
            placeholderTextColor={Colors.textMuted}
            value={inputValue}
            onChangeText={setInputValue}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            onSubmitEditing={() => handleSearch(inputValue)}
            accessibilityLabel="Search remedies"
            accessibilityHint="Type to search for remedies by name or symptoms"
          />
          {inputValue.length > 0 && (
            <TouchableOpacity
              style={styles.clearInputButton}
              onPress={handleClearSearch}
              activeOpacity={0.7}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results List */}
      <FlatList
        data={remedies}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={ListEmptyComponent}
        ListHeaderComponent={ListHeaderComponent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index + HEADER_HEIGHT,
          index,
        })}
      />
    </SafeAreaView>
  );
}

// Constants for getItemLayout
const ITEM_HEIGHT = 92;
const HEADER_HEIGHT = 36;

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
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
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  clearInputButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing['2xl'],
    ...webMaxWidth(WEB_LIST_MAX_WIDTH),
  },
  headerStats: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgPrimary,
  },
  statsText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  remedyItem: {
    backgroundColor: Colors.bgSurface,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  remedyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  remedyIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  remedyTextContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  remedyName: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  remedyPreview: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.sm * Typography.leading,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'] * 2,
  },
  emptyTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * Typography.relaxed,
  },
  clearButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  clearButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textInverse,
  },
});
