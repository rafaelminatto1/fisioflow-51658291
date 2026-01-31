/**
 * FisioFlow Design System - Avatar Component
 *
 * User avatar component with fallback
 * Supports images, initials, and status indicators
 */

import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
  /** Avatar source (image URI) */
  source?: { uri: string } | number;
  /** User initials (fallback) */
  initials?: string;
  /** User name (for generating initials) */
  name?: string;
  /** Avatar size */
  size?: AvatarSize;
  /** Border radius override */
  borderRadius?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
  /** Custom background color */
  backgroundColor?: string;
}

const sizeConfig = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 96,
};

/**
 * Generate initials from name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get color for initials
 */
function getInitialsColor(name: string, theme: any): string {
  const colors = [
    theme.colors.primary[500],
    theme.colors.secondary[500],
    theme.colors.success[500],
    theme.colors.warning[500],
    theme.colors.danger[500],
    theme.colors.info[500],
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash % colors.length);
  return colors[index];
}

/**
 * Avatar Component
 */
export function Avatar({
  source,
  initials,
  name,
  size = 'md',
  borderRadius,
  style,
  testID,
  backgroundColor,
}: AvatarProps) {
  const theme = useTheme();
  const avatarSize = sizeConfig[size];
  const defaultBorderRadius = borderRadius ?? avatarSize / 2;
  const fontSize = avatarSize * 0.4;

  // Get initials to display
  let displayInitials = initials;
  if (!displayInitials && name) {
    displayInitials = getInitials(name);
  }

  // Get background color
  const bgColor = backgroundColor || (name ? getInitialsColor(name, theme) : theme.colors.gray[300]);

  const containerStyle: ViewStyle = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: defaultBorderRadius,
    backgroundColor: bgColor,
  };

  const textStyle = {
    fontSize,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  };

  return (
    <View testID={testID} style={[styles.avatar, containerStyle, style]}>
      {source ? (
        <Image
          source={source}
          style={[styles.image, { borderRadius: defaultBorderRadius }]}
        />
      ) : displayInitials ? (
        <Text style={[styles.initials, textStyle]}>{displayInitials}</Text>
      ) : (
        <Text style={[styles.initials, textStyle]}>?</Text>
      )}
    </View>
  );
}

/**
 * Avatar with status indicator
 */
export interface AvatarWithStatusProps extends AvatarProps {
  /** Status type */
  status?: 'online' | 'offline' | 'away' | 'busy';
  /** Status position */
  statusPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const statusColors = {
  online: '#22C55E',
  offline: '#94A3B8',
  away: '#F59E0B',
  busy: '#EF4444',
};

const statusSize = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  '2xl': 16,
};

export function AvatarWithStatus({
  status = 'offline',
  statusPosition = 'bottom-right',
  size = 'md',
  ...avatarProps
}: AvatarWithStatusProps) {
  const avatarSize = sizeConfig[size];
  const dotSize = statusSize[size];
  const offset = dotSize / 2;

  const positionStyle: ViewStyle = {
    position: 'absolute',
  };

  switch (statusPosition) {
    case 'top-right':
      positionStyle.top = -offset;
      positionStyle.right = -offset;
      break;
    case 'top-left':
      positionStyle.top = -offset;
      positionStyle.left = -offset;
      break;
    case 'bottom-right':
      positionStyle.bottom = -offset;
      positionStyle.right = -offset;
      break;
    case 'bottom-left':
      positionStyle.bottom = -offset;
      positionStyle.left = -offset;
      break;
  }

  return (
    <View style={styles.avatarWithStatusContainer}>
      <Avatar size={size} {...avatarProps} />
      {status && (
        <View
          style={[
            styles.statusDot,
            positionStyle,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: statusColors[status],
              borderWidth: 2,
              borderColor: avatarProps.style?.backgroundColor || '#FFFFFF',
            },
          ]}
        />
      )}
    </View>
  );
}

/**
 * Avatar Group - stacked avatars
 */
export interface AvatarGroupProps {
  /** Avatar items */
  avatars: Array<{
    source?: { uri: string } | number;
    initials?: string;
    name?: string;
  }>;
  /** Avatar size */
  size?: AvatarSize;
  /** Maximum avatars to show (rest show as +N) */
  max?: number;
  /** Spacing between avatars */
  spacing?: number;
  /** Additional styles */
  style?: ViewStyle;
}

export function AvatarGroup({
  avatars,
  size = 'md',
  max = 3,
  spacing = -8,
  style,
}: AvatarGroupProps) {
  const theme = useTheme();
  const avatarSize = sizeConfig[size];

  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = Math.max(0, avatars.length - max);

  return (
    <View style={[styles.group, style]}>
      {visibleAvatars.map((avatar, index) => (
        <View
          key={index}
          style={[styles.groupItem, { marginLeft: index > 0 ? spacing : 0 }]}
        >
          <Avatar size={size} {...avatar} style={theme.shadows.sm} />
        </View>
      ))}
      {remainingCount > 0 && (
        <View style={[styles.groupItem, { marginLeft: spacing }]}>
          <View
            style={[
              styles.moreIndicator,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                backgroundColor: theme.colors.gray[200],
              },
            ]}
          >
            <Text style={{ fontSize: avatarSize * 0.35, fontWeight: '600', color: theme.colors.gray[600] }}>
              +{remainingCount}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    includeFontPadding: false,
  },
  avatarWithStatusContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  statusDot: {
    zIndex: 1,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItem: {
    position: 'relative',
  },
  moreIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
