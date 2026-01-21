/**
 * Skeleton - Native Component (React Native)
 *
 * Usa View + Animacao + NativeWind para loading skeleton
 */

import * as React from 'react';
import { View, Animated } from 'react-native';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton = React.forwardRef<View, SkeletonProps>(
  (
    {
      className = '',
      width,
      height,
      variant = 'rectangular',
    },
    ref
  ) => {
    const opacity = React.useRef(new Animated.Value(0.3));

    React.useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity.current, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity.current, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, []);

    const variantStyles = {
      text: 'h-4 w-full',
      circular: 'rounded-full',
      rectangular: 'rounded-md',
    };

    return (
      <Animated.View
        ref={ref}
        className={cn(
          'bg-muted',
          variantStyles[variant],
          className
        )}
        style={{
          width,
          height,
          opacity: opacity.current,
        }}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
