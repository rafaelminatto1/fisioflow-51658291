import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface MotionCardProps {
  variant?: 'glass' | 'glass-dark' | 'solid' | 'outlined';
  hoverEffect?: boolean;
  style?: any;
  children?: React.ReactNode;
  // Ignore web-specific props
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  className?: string;
  onClick?: () => void;
}

export const MotionCard = React.forwardRef<View, MotionCardProps>(
  ({ style, variant = 'solid', children, ...props }, ref) => {
    
    // Simple mapping of variants to basic RN styles
    // In a real app, this would use the theme context
    const getVariantStyle = (): ViewStyle => {
      switch (variant) {
        case 'glass':
          return { backgroundColor: 'rgba(255, 255, 255, 0.8)', borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1 };
        case 'glass-dark':
          return { backgroundColor: 'rgba(30, 41, 59, 0.8)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 };
        case 'outlined':
          return { backgroundColor: 'transparent', borderColor: '#e2e8f0', borderWidth: 1 };
        case 'solid':
        default:
          return { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1 };
      }
    };

    return (
      <View
        ref={ref}
        style={[
          styles.card,
          getVariantStyle(),
          style
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

MotionCard.displayName = 'MotionCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
  },
});
