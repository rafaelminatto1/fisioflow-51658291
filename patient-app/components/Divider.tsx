/**
 * Divider Component
 * Enhanced separator with text support
 */

import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

interface DividerProps {
  text?: string;
  style?: any;
  textStyle?: any;
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
}

export function Divider({
  text,
  style,
  textStyle,
  orientation = 'horizontal',
  thickness = 1,
}: DividerProps) {
  const colors = useColors();

  if (orientation === 'vertical') {
    return (
      <View style={[styles.verticalContainer, style]}>
        <View style={[styles.verticalLine, { backgroundColor: colors.border, width: thickness }]} />
        {text && (
          <Text style={[styles.verticalText, { color: colors.textSecondary }, textStyle]}>
            {text}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.horizontalContainer, style]}>
      <View style={[styles.horizontalLine, { backgroundColor: colors.border, height: thickness }]} />
      {text && (
        <>
          <Text style={[styles.horizontalText, { color: colors.textSecondary, marginHorizontal: 12 }, textStyle]}>
            {text}
          </Text>
          <View style={[styles.horizontalLine, { backgroundColor: colors.border, height: thickness }]} />
        </>
      )}
    </View>
  );
}

interface ListDividerProps {
  inset?: number;
  style?: any;
}

export function ListDivider({ inset = 16, style }: ListDividerProps) {
  const colors = useColors();

  return (
    <View style={[styles.listDivider, { backgroundColor: colors.border, marginLeft: inset }, style]} />
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalLine: {
    flex: 1,
  },
  horizontalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  verticalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  verticalLine: {
    height: '100%',
  },
  verticalText: {
    writingDirection: 'vertical',
    fontSize: 12,
    fontWeight: '500',
    marginVertical: 8,
  },
  listDivider: {
    height: 1,
  },
});
