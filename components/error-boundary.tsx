import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback component to show when an error occurs */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Context name for better error reporting */
  context?: string;
}

export interface ErrorBoundaryFallbackProps {
  error: Error;
  componentStack: string | null;
  resetError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

/**
 * A reusable error boundary component that catches React rendering errors
 * and displays a fallback UI. Use this to wrap error-prone sections of the app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store component stack for later use
    this.setState({ componentStack: errorInfo.componentStack ?? null });

    // Log error with context
    const context = this.props.context ?? 'ErrorBoundary';
    console.error(`[${context}] Error caught:`, error.name, error.message);
    console.error(`[${context}] Component stack:`, errorInfo.componentStack);

    // Call optional onError callback
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      componentStack: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      const { error, componentStack } = this.state;

      // If fallback is a function, call it with error details
      if (typeof fallback === 'function') {
        return fallback({
          error,
          componentStack,
          resetError: this.resetError,
        });
      }

      // If fallback is a component, render it
      if (fallback) {
        return fallback;
      }

      // Default fallback - show a visible error screen
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{error.message}</Text>
          <Text style={styles.errorName}>{error.name}</Text>
          <TouchableOpacity onPress={this.resetError} style={styles.button}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgPrimary,
    padding: Spacing.lg,
  },
  title: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.xl,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  message: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorName: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  buttonText: {
    fontFamily: Fonts?.body ?? 'System',
    color: Colors.textInverse,
    fontWeight: '600',
    fontSize: Typography.base,
  },
});
