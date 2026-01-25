/**
 * FisioFlow Design System - Divider Component
 *
 * Visual separator for content sections
 * Supports horizontal and vertical orientations
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { useTheme } from '../theme';

export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps {
  /** Divider orientation */
  orientation?: DividerOrientation;
  /** Divider thickness */
  thickness?: number;
  /** Divider length (width for horizontal, height for vertical) */
  length?: number | string;
  /** Custom color */
  color?: string;
  /** Dashed style */
  dashed?: boolean;
  /** With label in the middle */
  label?: string;
  /** Label position */
  labelPosition?: 'center' | 'start' | 'end';
  /** Spacing around divider */
  spacing?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

/**
 * Divider Component
 */
export function Divider({
  orientation = 'horizontal',
  thickness = 1,
  length,
  color,
  dashed = false,
  label,
  labelPosition = 'center',
  spacing = 16,
  style,
  testID,
}: DividerProps) {
  const theme = useTheme();
  const dividerColor = color || theme.colors.border;

  // Base divider style
  const baseStyle: ViewStyle = {
    backgroundColor: dividerColor,
  };

  // Orientation-specific styles
  if (orientation === 'horizontal') {
    baseStyle.height = thickness;
    baseStyle.width = (length || '100%') as DimensionValue;
  } else {
    baseStyle.width = thickness;
    baseStyle.height = (length || '100%') as DimensionValue;
  }

  // Dashed style simulation using border
  if (dashed) {
    baseStyle.backgroundColor = 'transparent';
    if (orientation === 'horizontal') {
      baseStyle.borderTopWidth = thickness;
      baseStyle.borderTopColor = dividerColor;
      baseStyle.borderStyle = 'dashed';
    } else {
      baseStyle.borderLeftWidth = thickness;
      baseStyle.borderLeftColor = dividerColor;
      baseStyle.borderStyle = 'dashed';
    }
  }

  // With label
  if (label) {
    return (
      <View
        testID={testID}
        style={[
          styles.labelContainer,
          { marginVertical: spacing },
          style,
        ]}
      >
        {labelPosition === 'start' && (
          <View style={[styles.line, baseStyle, { flex: 1 }]} />
        )}
        <View style={styles.labelSpacing} />
        <TextNative style={[styles.labelText, { color: theme.colors.text.secondary }]}>
          {label}
        </TextNative>
        <View style={styles.labelSpacing} />
        {labelPosition === 'end' && (
          <View style={[styles.line, baseStyle, { flex: 1 }]} />
        )}
        {(labelPosition === 'center' || labelPosition === 'start') && (
          <View style={[styles.line, baseStyle, { flex: 1 }]} />
        )}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[baseStyle, style]}
    />
  );
}

/**
 * Spacer Component
 * For adding consistent spacing
 */
export interface SpacerProps {
  /** Spacer orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Size of spacer */
  size?: number;
  /** Additional styles */
  style?: ViewStyle;
}

export function Spacer({
  orientation = 'vertical',
  size = 16,
  style,
}: SpacerProps) {
  const styleProp: ViewStyle = orientation === 'horizontal'
    ? { width: size }
    : { height: size };

  return <View style={[styles.spacer, styleProp, style]} />;
}

/**
 * Separator with Icon
 */
export interface IconSeparatorProps {
  /** Icon to display */
  icon: React.ReactElement;
  /** Separator thickness */
  thickness?: number;
  /** Separator color */
  color?: string;
  /** Additional styles */
  style?: ViewStyle;
}

export function IconSeparator({
  icon,
  thickness = 1,
  color,
  style,
}: IconSeparatorProps) {
  const theme = useTheme();
  const separatorColor = color || theme.colors.border;

  return (
    <View style={[styles.iconSeparator, style]}>
      <View style={[styles.iconSeparatorLine, { height: thickness, backgroundColor: separatorColor }]} />
      <View style={styles.iconSeparatorIcon}>{icon}</View>
      <View style={[styles.iconSeparatorLine, { height: thickness, backgroundColor: separatorColor }]} />
    </View>
  );
}

// Import Text to avoid circular dependencies
import { Text as TextNative } from 'react-native';

const styles = StyleSheet.create({
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    height: 1,
  },
  labelSpacing: {
    width: 12,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
    includeFontPadding: false,
  },
  spacer: {
    flexShrink: 0,
  },
  iconSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconSeparatorLine: {
    flex: 1,
  },
  iconSeparatorIcon: {
    flexShrink: 0,
  },
});
