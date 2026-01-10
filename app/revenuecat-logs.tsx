import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { clearRevenueCatLogs, getRevenueCatLogsAsString } from '@/lib/revenuecat-log-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

export default function RevenueCatLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const logText = await getRevenueCatLogsAsString();
      setLogs(logText || 'No logs available');
    } catch (error) {
      console.error('Failed to load logs:', error);
      setLogs('Failed to load logs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClearLogs = useCallback(() => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all Revenue Cat logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearRevenueCatLogs();
              setLogs('Logs cleared.');
              Alert.alert('Success', 'All logs have been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear logs. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const handleCopyLogs = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(logs);
      Alert.alert('Copied', 'Logs have been copied to clipboard.');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy logs to clipboard.');
    }
  }, [logs]);

  const filteredLogs = searchQuery
    ? logs
        .split('\n\n')
        .filter((log) => log.toLowerCase().includes(searchQuery.toLowerCase()))
        .join('\n\n')
    : logs;

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
        <Text style={styles.headerTitle}>Revenue Cat Logs</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={loadLogs}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={18} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCopyLogs}
          activeOpacity={0.7}
          disabled={!logs || logs === 'No logs available'}
        >
          <Ionicons name="copy-outline" size={18} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.clearButton]}
          onPress={handleClearLogs}
          activeOpacity={0.7}
          disabled={!logs || logs === 'No logs available'}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
          <Text style={[styles.actionButtonText, styles.clearButtonText]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Logs Display */}
      <ScrollView
        style={styles.logsContainer}
        contentContainerStyle={styles.logsContent}
        showsVerticalScrollIndicator={true}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading logs...</Text>
          </View>
        ) : filteredLogs ? (
          <Text style={styles.logText} selectable>
            {filteredLogs}
          </Text>
        ) : (
          <Text style={styles.emptyText}>No logs available</Text>
        )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  clearSearchButton: {
    marginLeft: Spacing.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryAlpha10,
  },
  clearButton: {
    backgroundColor: Colors.error + '10',
  },
  actionButtonText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.primary,
  },
  clearButtonText: {
    color: Colors.error,
  },
  logsContainer: {
    flex: 1,
  },
  logsContent: {
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  loadingText: {
    marginTop: Spacing.md,
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: Typography.xs,
    color: Colors.textPrimary,
    lineHeight: Typography.xs * 1.5,
  },
  emptyText: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing['2xl'],
  },
});
