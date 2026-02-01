import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  style,
}: BadgeProps) {
  const { colors } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: '#dcfce7', text: '#166534' };
      case 'warning':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'error':
        return { bg: '#fee2e2', text: '#991b1b' };
      case 'info':
        return { bg: '#dbeafe', text: '#1e40af' };
      default:
        return { bg: colors.card, text: colors.text };
    }
  };

  const colors_variant = getColors();

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[size],
        { backgroundColor: colors_variant.bg },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          sizeStylesText[size],
          { color: colors_variant.text },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  md: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lg: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});

const sizeStylesText = StyleSheet.create({
  sm: {
    fontSize: 10,
  },
  md: {
    fontSize: 11,
  },
  lg: {
    fontSize: 12,
  },
});
