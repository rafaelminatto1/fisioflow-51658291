/**
 * FisioFlow Design System - Badge Component
 *
 * Small status indicator component
 * Supports dots, icons, and text labels
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps {
  /** Badge content */
  children?: ReactNode | string | number;
  /** Color variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Show as dot only */
  dot?: boolean;
  /** Show icon instead of text */
  icon?: ReactNode;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

const sizeConfig = {
  xs: { paddingVertical: 2, paddingHorizontal: 6, fontSize: 9, dotSize: 6 },
  sm: { paddingVertical: 3, paddingHorizontal: 8, fontSize: 10, dotSize: 7 },
  md: { paddingVertical: 4, paddingHorizontal: 10, fontSize: 11, dotSize: 8 },
  lg: { paddingVertical: 5, paddingHorizontal: 12, fontSize: 12, dotSize: 9 },
};

/**
 * Get color scheme for variant
 */
function getVariantColors(theme: any, variant: BadgeVariant) {
  switch (variant) {
    case 'primary':
      return {
        background: theme.colors.primary[100],
        text: theme.colors.primary[700],
      };
    case 'success':
      return {
        background: theme.colors.success[100],
        text: theme.colors.success[700],
      };
    case 'warning':
      return {
        background: theme.colors.warning[100],
        text: theme.colors.warning[700],
      };
    case 'danger':
      return {
        background: theme.colors.danger[100],
        text: theme.colors.danger[700],
      };
    case 'info':
      return {
        background: theme.colors.info[100],
        text: theme.colors.info[700],
      };
    case 'gray':
    default:
      return {
        background: theme.colors.gray[100],
        text: theme.colors.gray[700],
      };
  }
}

/**
 * Badge Component
 */
export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  icon,
  style,
  testID,
}: BadgeProps) {
  const theme = useTheme();
  const config = sizeConfig[size];
  const colors = getVariantColors(theme, variant);

  if (dot) {
    return (
      <View
        testID={testID}
        style={[
          styles.dot,
          {
            width: config.dotSize,
            height: config.dotSize,
            borderRadius: config.dotSize / 2,
            backgroundColor: colors.text,
          },
          style,
        ]}
      />
    );
  }

  if (icon) {
    return (
      <View
        testID={testID}
        style={[
          styles.iconBadge,
          {
            backgroundColor: colors.background,
            borderRadius: theme.borderRadius.full,
          },
          style,
        ]}
      >
        {icon}
      </View>
    );
  }

  const displayValue =
    typeof children === 'number' && children > 99 ? '99+' : String(children);

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        {
          backgroundColor: colors.background,
          paddingVertical: config.paddingVertical,
          paddingHorizontal: config.paddingHorizontal,
          borderRadius: theme.borderRadius.full,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: config.fontSize,
            color: colors.text,
          },
        ]}
      >
        {displayValue}
      </Text>
    </View>
  );
}

/**
 * Status Badge - predefined semantic variants
 */
export interface StatusBadgeProps {
  status: 'online' | 'offline' | 'away' | 'busy' | 'active' | 'inactive';
  label?: string;
  showDot?: boolean;
  size?: BadgeSize;
  style?: ViewStyle;
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  size = 'sm',
  style,
}: StatusBadgeProps) {
  const variantMap: Record<string, BadgeVariant> = {
    online: 'success',
    active: 'success',
    offline: 'gray',
    inactive: 'gray',
    away: 'warning',
    busy: 'danger',
  };

  const defaultLabels: Record<string, string> = {
    online: 'Online',
    offline: 'Offline',
    away: 'Away',
    busy: 'Busy',
    active: 'Active',
    inactive: 'Inactive',
  };

  const displayLabel = label || defaultLabels[status];

  return (
    <View style={[styles.statusBadge, style]}>
      {showDot && <Badge variant={variantMap[status]} size={size} dot />}
      {displayLabel && (
        <Text style={styles.statusLabel}>{displayLabel}</Text>
      )}
    </View>
  );
}

/**
 * Count Badge - for notification counts
 */
export interface CountBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  size?: BadgeSize;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function CountBadge({
  count,
  max = 99,
  showZero = false,
  size = 'sm',
  variant = 'danger',
  style,
}: CountBadgeProps) {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge variant={variant} size={size} style={style}>
      {displayCount}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  dot: {
    alignSelf: 'flex-start',
  },
  iconBadge: {
    padding: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    includeFontPadding: false,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
