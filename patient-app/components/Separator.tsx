/**
 * Separator Component
 * Visual separator/divider
 */

import { View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

export type SeparatorOrientation = 'horizontal' | 'vertical';

interface SeparatorProps {
  orientation?: SeparatorOrientation;
  thickness?: number;
  color?: string;
  style?: any;
}

export function Separator({
  orientation = 'horizontal',
  thickness = 1,
  color,
  style,
}: SeparatorProps) {
  const colors = useColors();
  const separatorColor = color || colors.border;

  return (
    <View
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        {
          backgroundColor: separatorColor,
          height: orientation === 'horizontal' ? thickness : '100%',
          width: orientation === 'vertical' ? thickness : '100%',
        },
        style,
      ]}
    />
  );
}

interface SpacingProps {
  size?: number | 'small' | 'medium' | 'large';
  orientation?: SeparatorOrientation;
  style?: any;
}

export function Spacing({ size = 'medium', orientation = 'horizontal', style }: SpacingProps) {
  const getSize = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'small':
        return 8;
      case 'medium':
        return 16;
      case 'large':
        return 24;
      default:
        return 16;
    }
  };

  const dimension = getSize();

  return (
    <View
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        {
          height: orientation === 'horizontal' ? dimension : '100%',
          width: orientation === 'vertical' ? dimension : '100%',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  vertical: {
    height: '100%',
  },
});
