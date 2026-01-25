/**
 * FisioFlow Design System - Loading Component
 *
 * Consistent loading states with spinner and message
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

export interface LoadingProps {
  /** Size of the spinner */
  size?: 'small' | 'large';
  /** Custom color for the spinner */
  color?: string;
  /** Message to display below the spinner */
  message?: string;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

/**
 * Loading Component
 *
 * Displays a centered spinner with optional message
 *
 * @example
 * ```tsx
 * <Loading message="Carregando dados..." />
 * ```
 */
export function Loading({
  size = 'large',
  color,
  message,
  style,
  testID,
}: LoadingProps) {
  const theme = useTheme();
  const spinnerColor = color || theme.colors.primary[500];

  return (
    <View testID={testID} style={[styles.container, style]}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {message && (
        <Text style={[styles.message, { color: theme.colors.text.secondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

export interface LoadingScreenProps {
  /** Message to display */
  message?: string;
  /** Full screen style override */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

/**
 * Loading Screen Component
 *
 * Full-screen loading state for initial loads or page transitions
 *
 * @example
 * ```tsx
 * <LoadingScreen message="Carregando..." />
 * ```
 */
export function LoadingScreen({
  message = 'Carregando...',
  style,
  testID,
}: LoadingScreenProps) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.fullScreen,
        { backgroundColor: theme.colors.background },
        style,
      ]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      <Text style={[styles.screenMessage, { color: theme.colors.text.secondary }]}>
        {message}
      </Text>
    </View>
  );
}

export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Message to display */
  message?: string;
  /** Background opacity (0-1) */
  opacity?: number;
  /** Test ID */
  testID?: string;
}

/**
 * Loading Overlay Component
 *
 * Semi-transparent overlay that appears over content
 *
 * @example
 * ```tsx
 * <LoadingOverlay visible={isLoading} message="Processando..." />
 * ```
 */
export function LoadingOverlay({
  visible,
  message,
  opacity = 0.7,
  testID,
}: LoadingOverlayProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View
      testID={testID}
      style={[
        styles.overlay,
        { backgroundColor: `rgba(0, 0, 0, ${opacity})` },
      ]}
    >
      <View
        style={[
          styles.overlayContent,
          {
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        {message && (
          <Text style={[styles.overlayMessage, { color: theme.colors.text.secondary }]}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenMessage: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 120,
  },
  overlayMessage: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
