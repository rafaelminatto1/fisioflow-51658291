import React, { forwardRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps {
  children?: React.ReactNode;
  title?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      children,
      title,
      variant = 'primary',
      size = 'md',
      onPress,
      onLongPress,
      disabled = false,
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      style,
      ...props
    },
    ref
  ) => {
    const { colors } = useTheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      if (disabled || loading) return;
      scale.value = withSpring(0.96, { damping: 15 });
    };

    const handlePressOut = () => {
      if (disabled || loading) return;
      scale.value = withSpring(1, { damping: 15 });
    };

    const handlePress = () => {
      if (!disabled && !loading) {
        HapticFeedback.light();
        onPress?.();
      }
    };

    const handleLongPress = () => {
      if (!disabled && !loading) {
        HapticFeedback.medium();
        onLongPress?.();
      }
    };

    const getButtonStyle = () => {
      const baseStyle = [styles.button, sizeStyles[size]];

      switch (variant) {
        case 'primary':
          return [
            ...baseStyle,
            { backgroundColor: colors.primary },
          ];
        case 'secondary':
          return [
            ...baseStyle,
            { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
          ];
        case 'outline':
          return [
            ...baseStyle,
            { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
          ];
        case 'ghost':
          return [
            ...baseStyle,
            { backgroundColor: 'transparent' },
          ];
        case 'danger':
          return [
            ...baseStyle,
            { backgroundColor: colors.error },
          ];
        default:
          return baseStyle;
      }
    };

    const getTextStyle = () => {
      switch (variant) {
        case 'primary':
        case 'danger':
          return { color: '#fff' };
        case 'outline':
          return { color: colors.primary };
        case 'ghost':
          return { color: colors.text };
        default:
          return { color: colors.text };
      }
    };

    const content = (
      <>
        {loading ? (
          <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.primary : '#fff'} />
        ) : (
          <>
            {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
            {(title || children) && (
              <Text style={[styles.text, sizeStylesText[size], getTextStyle()]}>
                {title || children}
              </Text>
            )}
            {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
          </>
        )}
      </>
    );

    return (
      <AnimatedPressable
        ref={ref}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animatedStyle,
          getButtonStyle(),
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          style,
        ]}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </AnimatedPressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    alignItems: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

const sizeStyles = StyleSheet.create({
  xs: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 28,
  },
  sm: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 32,
  },
  md: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 52,
  },
});

const sizeStylesText = StyleSheet.create({
  xs: {
    fontSize: 12,
  },
  sm: {
    fontSize: 13,
  },
  md: {
    fontSize: 15,
  },
  lg: {
    fontSize: 16,
  },
});
