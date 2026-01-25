/**
 * FisioFlow Design System - Button Component
 *
 * Accessible button component with multiple variants
 * Supports loading state, icons, and full-width mode
 * Includes haptic feedback for better UX
 */

import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, useColor } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'ghost'
  | 'outline';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps {
  /** Button content */
  children: ReactNode;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Disable the button */
  disabled?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Icon to display before text */
  leftIcon?: ReactNode;
  /** Icon to display after text */
  rightIcon?: ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** onPress handler */
  onPress: () => void;
  /** Additional styles */
  style?: ViewStyle;
  /** Text style override */
  textStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
  /** Enable haptic feedback */
  haptic?: boolean;
}

const sizeConfig = {
  xs: { paddingVertical: 6, paddingHorizontal: 10, fontSize: 11, iconSize: 14, gap: 4 },
  sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 12, iconSize: 16, gap: 6 },
  md: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 14, iconSize: 18, gap: 8 },
  lg: { paddingVertical: 14, paddingHorizontal: 20, fontSize: 16, iconSize: 20, gap: 8 },
  xl: { paddingVertical: 18, paddingHorizontal: 24, fontSize: 18, iconSize: 22, gap: 10 },
};

/**
 * Get haptic feedback type based on button variant
 */
function getHapticType(variant: ButtonVariant): Haptics.ImpactFeedbackStyle {
  switch (variant) {
    case 'danger':
      return Haptics.ImpactFeedbackStyle.Heavy;
    case 'primary':
    case 'success':
      return Haptics.ImpactFeedbackStyle.Medium;
    default:
      return Haptics.ImpactFeedbackStyle.Light;
  }
}

/**
 * Button Component
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  onPress,
  style,
  textStyle,
  testID,
  haptic = true,
}: ButtonProps) {
  const theme = useTheme();

  const config = sizeConfig[size];
  const isDisabled = disabled || loading;
  const opacity = isDisabled ? 0.5 : 1;

  const handlePress = () => {
    if (isDisabled) return;

    if (haptic) {
      try {
        Haptics.impactAsync(getHapticType(variant));
      } catch {
        // Haptics not supported, silently ignore
      }
    }

    onPress();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: config.paddingVertical,
      paddingHorizontal: config.paddingHorizontal,
      borderRadius: theme.borderRadius.md,
      opacity,
      minWidth: fullWidth ? '100%' : undefined,
      width: fullWidth ? '100%' : undefined,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary[500],
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.secondary[500],
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.success[500],
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.warning[500],
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.danger[500],
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: theme.colors.primary[500],
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    return {
      color:
        variant === 'ghost' || variant === 'outline'
          ? theme.colors.primary[500]
          : '#FFFFFF',
      fontSize: config.fontSize,
      fontWeight: '600',
      textAlign: 'center',
    };
  };

  const buttonStyle = getButtonStyle();
  const computedTextStyle = getTextStyle();

  return (
    <TouchableOpacity
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[styles.button, buttonStyle, style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' || variant === 'outline' ? theme.colors.primary[500] : '#FFFFFF'}
        />
      ) : (
        <>
          {leftIcon && <View style={{ marginRight: config.gap }}>{leftIcon}</View>}
          <Text style={[styles.text, computedTextStyle, textStyle]}>{children}</Text>
          {rightIcon && <View style={{ marginLeft: config.gap }}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}

/**
 * Gradient Button Variant
 * Uses a gradient background for emphasis
 */
export interface GradientButtonProps extends Omit<ButtonProps, 'variant'> {
  /** Gradient colors */
  colors?: string[];
  /** Gradient direction angle */
  angle?: number;
}

export function GradientButton({
  children,
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  onPress,
  colors,
  angle = 45,
  style,
  testID,
  haptic = true,
}: GradientButtonProps) {
  const theme = useTheme();
  const config = sizeConfig[size];
  const isDisabled = disabled || loading;
  const opacity = isDisabled ? 0.5 : 1;

  const gradientColors = colors || [theme.colors.primary[400], theme.colors.primary[600]];

  const handlePress = () => {
    if (isDisabled) return;

    if (haptic) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Haptics not supported
      }
    }

    onPress();
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.9}
      style={[styles.button, { opacity, borderRadius: theme.borderRadius.md, overflow: 'hidden' }, fullWidth && { width: '100%' }]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: config.paddingVertical,
          paddingHorizontal: config.paddingHorizontal,
          width: '100%',
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            {leftIcon && <View style={{ marginRight: config.gap }}>{leftIcon}</View>}
            <Text style={[styles.text, { color: '#FFFFFF', fontSize: config.fontSize, fontWeight: '600' }]}>{children}</Text>
            {rightIcon && <View style={{ marginLeft: config.gap }}>{rightIcon}</View>}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'relative',
  },
  text: {
    includeFontPadding: false,
  },
});
