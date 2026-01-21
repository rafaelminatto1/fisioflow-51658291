/**
 * Progress - Native Component (React Native)
 *
 * Usa View + Animated + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { cn } from '@/lib/utils';

export interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

export const Progress = React.forwardRef<View, ProgressProps>(
  (
    {
      value = 0,
      max = 100,
      className = '',
      indicatorClassName = '',
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const animatedValue = React.useRef(new Animated.Value(0));

    React.useEffect(() => {
      Animated.timing(animatedValue.current, {
        toValue: percentage,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, [percentage]);

    return (
      <View
        ref={ref}
        className={cn(
          'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
          className
        )}
        style={styles.container}
      >
        <Animated.View
          className={cn('h-full bg-primary', indicatorClassName)}
          style={{
            width: animatedValue.current.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>
    );
  }
);

Progress.displayName = 'Progress';

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'hsl(var(--secondary))',
  },
});

export default Progress;
