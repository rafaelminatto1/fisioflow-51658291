/**
 * FisioFlow Design System - Progress Component
 *
 * Progress indicators and loading spinners
 * Supports determinate and indeterminate states
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

export type ProgressSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ProgressProps {
  /** Progress value (0-100) */
  value?: number;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Size */
  size?: ProgressSize;
  /** Progress color */
  color?: string;
  /** Track color */
  trackColor?: string;
  /** Height/thickness */
  height?: number;
  /** Rounded corners */
  rounded?: boolean;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

const sizeConfig = {
  xs: { height: 4 },
  sm: { height: 6 },
  md: { height: 8 },
  lg: { height: 10 },
  xl: { height: 12 },
};

/**
 * Progress Bar Component
 */
export function Progress({
  value = 0,
  indeterminate = false,
  size = 'md',
  color,
  trackColor,
  height,
  rounded = true,
  style,
  testID,
}: ProgressProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const indeterminateAnim = useSharedValue(0);

  const progressHeight = height ?? sizeConfig[size].height;
  const progressColor = color || theme.colors.primary[500];
  const bgTrackColor = trackColor || theme.colors.gray[200];

  // Animate progress value
  React.useEffect(() => {
    if (!indeterminate) {
      progress.value = withTiming(value / 100, { duration: 300 });
    }
  }, [value, indeterminate]);

  // Animate indeterminate state
  React.useEffect(() => {
    if (indeterminate) {
      indeterminateAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
    }
  }, [indeterminate]);

  const progressStyle = useAnimatedStyle(() => {
    if (indeterminate) {
      return {
        width: '30%',
        left: `${indeterminateAnim.value * 70}%`,
      };
    }
    return {
      width: `${progress.value * 100}%`,
    };
  });

  return (
    <View
      testID={testID}
      style={[
        styles.progressContainer,
        {
          height: progressHeight,
          backgroundColor: bgTrackColor,
          borderRadius: rounded ? progressHeight / 2 : 0,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.progressFill,
          progressStyle,
          {
            backgroundColor: progressColor,
            borderRadius: rounded ? progressHeight / 2 : 0,
          },
        ]}
      />
    </View>
  );
}

/**
 * Circular Progress Component
 */
export interface CircularProgressProps {
  /** Progress value (0-100) */
  value: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Progress color */
  color?: string;
  /** Track color */
  trackColor?: string;
  /** Show label */
  showLabel?: boolean;
  /** Label format */
  labelFormat?: 'percentage' | 'value' | ((value: number) => string);
  /** Additional styles */
  style?: ViewStyle;
}

export function CircularProgress({
  value,
  size = 40,
  strokeWidth = 3,
  color,
  trackColor,
  showLabel = false,
  labelFormat = 'percentage',
  style,
}: CircularProgressProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  const progressColor = color || theme.colors.primary[500];
  const bgTrackColor = trackColor || theme.colors.gray[200];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  React.useEffect(() => {
    progress.value = withTiming(value / 100, { duration: 500 });
  }, [value]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: '-90deg' }],
  }));

  const strokeStyle = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const formatLabel = (val: number): string => {
    if (typeof labelFormat === 'function') {
      return labelFormat(val);
    }
    if (labelFormat === 'value') {
      return `${Math.round(val)}`;
    }
    return `${Math.round(val)}%`;
  };

  return (
    <View style={[styles.circularContainer, style]}>
      <View style={{ width: size, height: size }}>
        {/* Track */}
        <View style={[StyleSheet.absoluteFill, rotateStyle]}>
          <Svg width={size} height={size} style={rotateStyle}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={bgTrackColor}
              strokeWidth={strokeWidth}
            />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={progressColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={[circumference, circumference]}
              animatedProps={strokeStyle}
            />
          </Svg>
        </View>
      </View>

      {/* Label */}
      {showLabel && (
        <View style={styles.circularLabel}>
          <Text
            style={[
              styles.circularLabelText,
              {
                fontSize: size * 0.25,
                color: progressColor,
              },
            ]}
          >
            {formatLabel(value)}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Spinner (Loading Indicator)
 */
export interface SpinnerProps {
  /** Size */
  size?: ProgressSize;
  /** Color */
  color?: string;
  /** Additional styles */
  style?: ViewStyle;
}

export function Spinner({ size = 'md', color, style }: SpinnerProps) {
  const theme = useTheme();
  const rotation = useSharedValue(0);

  const spinnerColor = color || theme.colors.primary[500];

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000 }),
      -1,
      false
    );
  }, []);

  const sizeConfig: Record<ProgressSize, number> = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
  };

  const spinnerSize = sizeConfig[size];
  const strokeWidth = size === 'xs' ? 2 : size === 'xl' ? 4 : 3;

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={[
        styles.spinnerContainer,
        {
          width: spinnerSize,
          height: spinnerSize,
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, rotateStyle]}>
        <Svg width={spinnerSize} height={spinnerSize}>
          <Circle
            cx={spinnerSize / 2}
            cy={spinnerSize / 2}
            r={(spinnerSize - strokeWidth) / 2}
            fill="none"
            stroke={spinnerColor}
            strokeWidth={strokeWidth}
            strokeDasharray={[spinnerSize * 0.7, spinnerSize * 0.3]}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// SVG components (using react-native-svg)
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Skeleton Loader (inline with Progress)
 */
export interface ProgressLinearProps {
  /** Loading state */
  loading?: boolean;
  /** Children to show when not loading */
  children?: React.ReactNode;
  /** Progress value */
  value?: number;
  /** Indeterminate */
  indeterminate?: boolean;
}

export function ProgressLinear({
  loading = false,
  children,
  value,
  indeterminate = true,
}: ProgressLinearProps) {
  if (!loading) {
    return <>{children}</>;
  }

  return <Progress value={value} indeterminate={indeterminate} />;
}

const styles = StyleSheet.create({
  progressContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularLabelText: {
    fontWeight: '600',
    includeFontPadding: false,
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
