/**
 * Avatar Component
 * User profile picture with fallback
 */

import { View, Image, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

export type AvatarSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type AvatarVariant = 'circle' | 'square' | 'rounded';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  backgroundColor?: string;
  style?: any;
  onPress?: () => void;
}

const SIZE_MAP = {
  xsmall: 24,
  small: 32,
  medium: 40,
  large: 48,
  xlarge: 64,
};

const FONT_SIZE_MAP = {
  xsmall: 10,
  small: 12,
  medium: 14,
  large: 18,
  xlarge: 24,
};

const BORDER_RADIUS_MAP = {
  circle: 999,
  square: 0,
  rounded: 8,
};

export function Avatar({
  uri,
  name,
  size = 'medium',
  variant = 'circle',
  backgroundColor,
  style,
  onPress,
}: AvatarProps) {
  const colors = useColors();
  const avatarSize = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const borderRadius = BORDER_RADIUS_MAP[variant];

  // Get initials from name
  const getInitials = (nameStr?: string): string => {
    if (!nameStr) return '?';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getAvatarColor = (nameStr?: string): string => {
    if (backgroundColor) return backgroundColor;

    const colors_array = [
      '#22c55e', // green
      '#3b82f6', // blue
      '#f59e0b', // orange
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#14b8a6', // teal
    ];

    if (!nameStr) return colors_array[0];

    const index = nameStr.charCodeAt(0) % colors_array.length;
    return colors_array[index];
  };

  const content = (
    <View
      style={[
        styles.avatar,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius,
          backgroundColor: uri ? 'transparent' : getAvatarColor(name),
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: avatarSize, height: avatarSize, borderRadius }]}
        />
      ) : (
        <Text style={[styles.text, { fontSize, color: '#FFFFFF' }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <View style={style} onStartShouldSetResponder={() => true} onResponderRelease={onPress}>
        {content}
      </View>
    );
  }

  return <View style={style}>{content}</View>;
}

interface AvatarGroupProps {
  avatars: Array<{ uri?: string; name?: string }>;
  max?: number;
  size?: AvatarSize;
  style?: any;
}

export function AvatarGroup({ avatars, max = 3, size = 'medium', style }: AvatarGroupProps) {
  const colors = useColors();
  const avatarSize = SIZE_MAP[size];
  const overlap = avatarSize * 0.3;

  return (
    <View style={[styles.avatarGroup, style]}>
      {avatars.slice(0, max).map((avatar, index) => (
        <Avatar
          key={index}
          uri={avatar.uri}
          name={avatar.name}
          size={size}
          style={{ marginLeft: index > 0 ? -overlap : 0 }}
        />
      ))}
      {avatars.length > max && (
        <View
          style={[
            styles.avatar,
            styles.moreAvatars,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: 999,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text style={[styles.moreText, { color: colors.textSecondary, fontSize: FONT_SIZE_MAP[size] }]}>
            +{avatars.length - max}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  text: {
    fontWeight: '600',
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreAvatars: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreText: {
    fontWeight: '600',
  },
});
