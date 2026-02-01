/**
 * Badge Component
 * Small badge for status indicators, counts, etc.
 */

import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  children: string | number;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: any;
}

const sizeStyles = {
  small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, dotSize: 6 },
  medium: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, dotSize: 8 },
  large: { paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, dotSize: 10 },
};

export function Badge({
  children,
  variant = 'default',
  size = 'medium',
  dot = false,
  style,
}: BadgeProps) {
  const colors = useColors();
  const dimensions = useWindowDimensions();

  const getVariantStyle = () => {
    switch (variant) {
      case 'success':
        return { backgroundColor: colors.success + '20', color: colors.success };
      case 'warning':
        return { backgroundColor: colors.warning + '20', color: colors.warning };
      case 'error':
        return { backgroundColor: colors.error + '20', color: colors.error };
      case 'info':
        return { backgroundColor: colors.info + '20', color: colors.info };
      default:
        return { backgroundColor: colors.primary + '20', color: colors.primary };
    }
  };

  const variantStyle = getVariantStyle();
  const sizeStyle = sizeStyles[size];

  if (dot) {
    return (
      <View
        style={[
          styles.dot,
          {
            backgroundColor: variantStyle.backgroundColor,
            width: sizeStyle.dotSize,
            height: sizeStyle.dotSize,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyle.backgroundColor,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
          minWidth: dimensions.fontScale * 20,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: variantStyle.color,
            fontSize: sizeStyle.fontSize,
          },
        ]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
  },
  dot: {
    borderRadius: 999,
  },
  text: {
    fontWeight: '600',
    includeFontPadding: false,
  },
});
