import React, { forwardRef } from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';

  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated' | 'gradient';
  gradientColors?: string[];
  onPress?: () => void;
  disabled?: boolean;
  padding?: number;
}

export const Card = forwardRef<View, CardProps>(
  (
    {
      children,
      style,
      variant = 'default',
      gradientColors,
      onPress,
      disabled = false,
      padding = 16,
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
      if (disabled) return;
      scale.value = withSpring(0.98, { damping: 15 });
    };

    const handlePressOut = () => {
      if (disabled) return;
      scale.value = withSpring(1, { damping: 15 });
    };

    const cardStyle = [
      styles.card,
      {
        backgroundColor: variant === 'outlined' ? 'transparent' : colors.card,
        borderColor: colors.border,
        padding,
      },
      variant === 'outlined' && styles.outlined,
      variant === 'elevated' && styles.elevated,
      style,
    ];

    const content = (
      <>
        {variant === 'gradient' && gradientColors ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, cardStyle]}
          >
            {children}
          </LinearGradient>
        ) : (
          <View style={cardStyle} {...props}>
            {children}
          </View>
        )}
      </>
    );

    if (onPress && !disabled) {
      return (
        <AnimatedPressable
          ref={ref}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[animatedStyle, style]}
          disabled={disabled}
        >
          {content}
        </AnimatedPressable>
      );
    }

    return content;
  }
);

Card.displayName = 'Card';

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  outlined: {
    borderWidth: 1.5,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  gradient: {
    // Gradient style handles its own background
  },
});
