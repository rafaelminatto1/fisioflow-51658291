/**
 * FisioFlow Design System - Skeleton Component
 *
 * Loading placeholder components for better UX
 * Uses shimmer animation effect
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  StyleProp,
  DimensionValue,
} from 'react-native';
import { useTheme } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

export interface SkeletonProps {
  /** Skeleton width */
  width?: number | string;
  /** Skeleton height */
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

/**
 * Shimmer Animation Component
 */
function Shimmer({ style }: { style?: StyleProp<ViewStyle> }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const theme = useTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      })
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const shimmerColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    ],
  });

  return (
    <Animated.View style={[{ backgroundColor: shimmerColor }, style]} />
  );
}

/**
 * Base Skeleton Component
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
  testID,
}: SkeletonProps) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.skeleton,
        {
          width: width as DimensionValue,
          height: height as DimensionValue,
          borderRadius,
          backgroundColor: theme.isDark
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(0,0,0,0.05)',
        },
        style,
      ]}
    >
      <Shimmer style={StyleSheet.absoluteFill} />
    </View>
  );
}

/**
 * Skeleton variants for common patterns
 */

export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Width of each line (percentage or px) */
  width?: number | string;
  /** Line height */
  lineHeight?: number;
  /** Spacing between lines */
  spacing?: number;
  /** Last line width (percentage of first line) */
  lastLineWidthPercent?: number;
  /** Additional styles */
  style?: ViewStyle;
}

/**
 * Text Skeleton (for paragraphs)
 */
export function SkeletonText({
  lines = 3,
  width = '100%',
  lineHeight = 16,
  spacing = 8,
  lastLineWidthPercent = 70,
  style,
}: SkeletonTextProps) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? `${lastLineWidthPercent}%` : width}
          height={lineHeight}
          style={{ marginBottom: i < lines - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
}

export interface SkeletonAvatarProps {
  /** Avatar size */
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional styles */
  style?: ViewStyle;
}

const avatarSizes = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

/**
 * Avatar Skeleton
 */
export function SkeletonAvatar({ size = 'md', style }: SkeletonAvatarProps) {
  const avatarSize = typeof size === 'number' ? size : avatarSizes[size];

  return (
    <Skeleton
      width={avatarSize}
      height={avatarSize}
      borderRadius={avatarSize / 2}
      style={style}
    />
  );
}

export interface SkeletonCardProps {
  /** Card padding */
  padding?: number;
  /** Show avatar */
  avatar?: boolean;
  /** Avatar size */
  avatarSize?: number;
  /** Number of title lines */
  titleLines?: number;
  /** Number of description lines */
  descriptionLines?: number;
  /** Additional styles */
  style?: ViewStyle;
}

/**
 * Card Skeleton
 */
export function SkeletonCard({
  padding = 16,
  avatar = false,
  avatarSize = 40,
  titleLines = 1,
  descriptionLines = 3,
  style,
}: SkeletonCardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {avatar && (
        <View style={styles.cardAvatar}>
          <SkeletonAvatar size={avatarSize} />
        </View>
      )}
      <View style={styles.cardContent}>
        <SkeletonText lines={titleLines} lineHeight={18} spacing={6} />
        <SkeletonText
          lines={descriptionLines}
          lineHeight={14}
          spacing={4}
          style={styles.cardDescription}
        />
      </View>
    </View>
  );
}

export interface SkeletonListProps {
  /** Number of items */
  items?: number;
  /** Item height */
  itemHeight?: number;
  /** Spacing between items */
  spacing?: number;
  /** Additional styles */
  style?: ViewStyle;
}

/**
 * List Skeleton
 */
export function SkeletonList({
  items = 5,
  itemHeight = 60,
  spacing = 12,
  style,
}: SkeletonListProps) {
  return (
    <View style={style}>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton
          key={i}
          width="100%"
          height={itemHeight}
          borderRadius={12}
          style={{ marginBottom: i < items - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'column',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
  },
  cardAvatar: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardDescription: {
    marginTop: 8,
  },
});
