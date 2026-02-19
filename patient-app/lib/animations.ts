/**
 * Animation Utilities
 * Consistent animations and transitions
 */


/**
 * Animation configurations
 */

import { Animated, Easing } from 'react-native';

export const Animations = {
  // Durations (in ms)
  durations: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    extraSlow: 750,
  },

  // Easing functions
  easing: {
    ease: Easing.ease,
    easeIn: Easing.in(Easing.ease),
    easeOut: Easing.out(Easing.ease),
    easeInOut: Easing.inOut(Easing.ease),
    cubic: Easing.bezier(0.25, 0.1, 0.25, 1),
    spring: Easing.bezier(0.175, 0.885, 0.32, 1.275),
    bounce: Easing.bounce,
  },
};

/**
 * Fade in animation
 */
export function fadeIn(
  animatedValue: Animated.Value,
  duration: number = Animations.durations.normal,
  delay: number = 0
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    delay,
    easing: Animations.easing.easeOut,
    useNativeDriver: true,
  });
}

/**
 * Fade out animation
 */
export function fadeOut(
  animatedValue: Animated.Value,
  duration: number = Animations.durations.normal,
  delay: number = 0
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    delay,
    easing: Animations.easing.easeIn,
    useNativeDriver: true,
  });
}

/**
 * Slide in from direction
 */
export function slideIn(
  animatedValue: Animated.Value,
  direction: 'left' | 'right' | 'up' | 'down' = 'right',
  distance: number = 100,
  duration: number = Animations.durations.normal
): Animated.CompositeAnimation {
  const toValue = direction === 'left' || direction === 'right' ? 0 : 0;
  const fromValue =
    direction === 'left' ? -distance : direction === 'right' ? distance : 0;

  animatedValue.setValue(fromValue);

  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Animations.easing.cubic,
    useNativeDriver: true,
  });
}

/**
 * Scale animation
 */
export function scaleIn(
  animatedValue: Animated.Value,
  duration: number = Animations.durations.normal,
  delay: number = 0
): Animated.CompositeAnimation {
  animatedValue.setValue(0);

  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    delay,
    easing: Animations.easing.spring,
    useNativeDriver: true,
  });
}

/**
 * Scale out animation
 */
export function scaleOut(
  animatedValue: Animated.Value,
  duration: number = Animations.durations.fast
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: Animations.easing.easeIn,
    useNativeDriver: true,
  });
}

/**
 * Shimmer effect for loading
 */
export function shimmer(
  shimmerValue: Animated.Value,
  duration: number = 1500
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.timing(shimmerValue, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).reverse((result: Animated.CompositeAnimation) => {
      shimmerValue.setValue(0);
      return result;
    })
  );
}

/**
 * Spring animation
 */
export function spring(
  animatedValue: Animated.Value,
  toValue: number,
  options?: {
    tension?: number;
    friction?: number;
  }
): Animated.CompositeAnimation {
  return Animated.spring(animatedValue, {
    toValue,
    tension: options?.tension || 50,
    friction: options?.friction || 7,
    useNativeDriver: true,
  });
}

/**
 * Rotate animation
 */
export function rotate(
  animatedValue: Animated.Value,
  duration: number = 1000
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  );
}

/**
 * Parallel animations
 */
export function parallel(...animations: Animated.CompositeAnimation[]): Animated.CompositeAnimation {
  return Animated.parallel(animations);
}

/**
 * Sequential animations
 */
export function sequence(...animations: Animated.CompositeAnimation[]): Animated.CompositeAnimation {
  return Animated.sequence(animations);
}

/**
 * Stagger animations (with delay between each)
 */
export function stagger(
  delayMs: number,
  ...animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation {
  return Animated.stagger(delayMs, animations);
}

/**
 * Delay helper
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Animation presets
 */
export const Presets = {
  fadeIn: (value: Animated.Value) => fadeIn(value, Animations.durations.fast),
  fadeOut: (value: Animated.Value) => fadeOut(value, Animations.durations.fast),
  slideInRight: (value: Animated.Value) => slideIn(value, 'right', 50, Animations.durations.normal),
  slideInLeft: (value: Animated.Value) => slideIn(value, 'left', 50, Animations.durations.normal),
  slideInUp: (value: Animated.Value) => slideIn(value, 'up', 50, Animations.durations.normal),
  slideInDown: (value: Animated.Value) => slideIn(value, 'down', 50, Animations.durations.normal),
  scaleIn: (value: Animated.Value) => scaleIn(value, Animations.durations.normal),
  scaleOut: (value: Animated.Value) => scaleOut(value, Animations.durations.fast),
  bounce: (value: Animated.Value) => spring(value, 1, { tension: 150, friction: 5 }),
  pulse: (value: Animated.Value) => {
    return Animated.loop(
      Animated.sequence([
        spring(value, 1.05, { tension: 100, friction: 5 }),
        spring(value, 1, { tension: 100, friction: 5 }),
      ])
    );
  },
};

/**
 * Hook for fade-in animation
 */
export function useFadeIn(delay: number = 0) {
  const opacity = new Animated.Value(0);

  const start = () => {
    fadeIn(opacity, Animations.durations.normal, delay).start();
  };

  const reset = () => {
    opacity.setValue(0);
  };

  return { opacity, start, reset };
}

/**
 * Hook for slide-in animation
 */
export function useSlideIn(direction: 'left' | 'right' | 'up' | 'down' = 'right') {
  const translate = new Animated.Value(
    direction === 'left' || direction === 'right' ? 100 : 0
  );

  const start = () => {
    slideIn(translate, direction, 100, Animations.durations.normal).start();
  };

  const reset = () => {
    const fromValue =
      direction === 'left' ? -100 : direction === 'right' ? 100 : 0;
    translate.setValue(fromValue);
  };

  return { translate, start, reset };
}

/**
 * Create interpolations for common patterns
 */
export const Interpolate = {
  // Opacity from 0 to 1
  opacity: (animated: Animated.AnimatedInterpolation<number> | Animated.Value) => ({
    opacity: animated.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  }),

  // Scale from 0.5 to 1
  scale: (animated: Animated.AnimatedInterpolation<number> | Animated.Value) => ({
    transform: [
      {
        scale: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        }),
      },
    ],
  }),

  // Slide X from -100 to 0
  slideFromLeft: (animated: Animated.AnimatedInterpolation<number> | Animated.Value) => ({
    transform: [
      {
        translateX: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [-100, 0],
        }),
      },
    ],
  }),

  // Slide X from 100 to 0
  slideFromRight: (animated: Animated.AnimatedInterpolation<number> | Animated.Value) => ({
    transform: [
      {
        translateX: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
        }),
      },
    ],
  }),

  // Slide Y from -50 to 0
  slideFromTop: (animated: Animated.AnimatedInterpolation<number> | Animated.Value) => ({
    transform: [
      {
        translateY: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [-50, 0],
        }),
      },
    ],
  }),

  // Slide Y from 50 to 0
  slideFromBottom: (animated: Animated.AnimatedInterpolation<number> | Animated.Value) => ({
    transform: [
      {
        translateY: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
    ],
  }),

  // Rotate 0 to 360
  rotate: (animated: Animated.AnimatedInterpolation<number> | Animated.Value) => ({
    transform: [
      {
        rotate: animated.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  }),
};
