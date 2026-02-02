/**
 * Progress Component
 * Linear and circular progress indicators
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

export type ProgressSize = 'small' | 'medium' | 'large' | number;

interface LinearProgressProps {
  progress?: number; // 0 to 1
  variant?: 'determinate' | 'indeterminate';
  color?: string;
  trackColor?: string;
  height?: number;
  style?: any;
}

export function LinearProgress({
  progress = 0,
  variant = 'determinate',
  color,
  trackColor,
  height = 4,
  style,
}: LinearProgressProps) {
  const colors = useColors();
  const progressColor = color || colors.primary;
  const trackBackgroundColor = trackColor || colors.border;

  return (
    <View style={[styles.linearContainer, style, { height }]}>
      <View style={[styles.linearTrack, { backgroundColor: trackBackgroundColor }]}>
        {variant === 'determinate' ? (
          <View
            style={[
              styles.linearFill,
              {
                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.linearIndeterminate,
              { backgroundColor: progressColor },
            ]}
          />
        )}
      </View>
    </View>
  );
}

interface CircularProgressProps {
  progress?: number; // 0 to 1
  size?: ProgressSize;
  thickness?: number;
  color?: string;
  trackColor?: string;
  showLabel?: boolean;
  label?: string;
  labelStyle?: any;
  style?: any;
}

export function CircularProgress({
  progress = 0,
  size = 'medium',
  thickness = 4,
  color,
  trackColor,
  showLabel = false,
  label,
  labelStyle,
  style,
}: CircularProgressProps) {
  const colors = useColors();
  const progressColor = color || colors.primary;
  const trackBackgroundColor = trackColor || colors.border;

  const getSize = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 64;
      default:
        return 48;
    }
  };

  const sizeValue = getSize();
  const radius = (sizeValue - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;
  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.circularContainer, style]}>
      <View style={{ width: sizeValue, height: sizeValue }}>
        {/* Track */}
        <View
          style={[
            styles.circularTrack,
            {
              width: sizeValue,
              height: sizeValue,
              borderRadius: sizeValue / 2,
              borderWidth: thickness,
              borderColor: trackBackgroundColor,
            },
          ]}
        />
        {/* Progress */}
        {progress > 0 && (
          <View
            style={[
              styles.circularProgress,
              {
                width: sizeValue,
                height: sizeValue,
                borderRadius: sizeValue / 2,
                borderTopColor: progressColor,
                borderRightColor: progressColor,
                borderBottomColor: progressColor,
                borderLeftColor: 'transparent',
                borderWidth: thickness,
                transform: [{ rotate: '-90deg' }],
              },
            ]}
          />
        )}
        {/* Label */}
        {(showLabel || label !== undefined) && (
          <View style={styles.circularLabel}>
            {label !== undefined ? (
              <Text style={[styles.circularLabelText, labelStyle]}>{label}</Text>
            ) : (
              <Text style={[styles.circularLabelText, labelStyle]}>{percentage}%</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

interface ProgressStepsProps {
  steps: Array<{ label: string; completed?: boolean; current?: boolean; error?: boolean }>;
  style?: any;
}

export function ProgressSteps({ steps, style }: ProgressStepsProps) {
  const colors = useColors();

  return (
    <View style={[styles.stepsContainer, style]}>
      {steps.map((step, index) => (
        <View key={index} style={styles.stepItem}>
          {/* Step circle */}
          <View
            style={[
              styles.stepCircle,
              step.error && styles.stepError,
              step.completed && styles.stepCompleted,
              step.current && styles.stepCurrent,
              step.completed && { backgroundColor: colors.success },
              step.error && { backgroundColor: colors.error },
              step.current && { backgroundColor: colors.primary, borderWidth: 0 },
            ]}
          >
            {step.completed ? (
              <Text style={styles.stepCompletedText}>✓</Text>
            ) : step.error ? (
              <Text style={styles.stepErrorText}>!</Text>
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  step.current && { color: '#FFFFFF' },
                  { color: step.completed || step.error ? '#FFFFFF' : colors.text },
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>

          {/* Step label */}
          {step.label && (
            <Text
              style={[
                styles.stepLabel,
                step.current && { color: colors.primary, fontWeight: '600' },
                { color: colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          )}

          {/* Connector line */}
          {index < steps.length - 1 && (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: index < steps.length - 1 ? colors.border : colors.transparent },
                step.completed && { backgroundColor: colors.success },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  linearContainer: {
    overflow: 'hidden',
  },
  linearTrack: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  linearFill: {
    height: '100%',
    borderRadius: 999,
  },
  linearIndeterminate: {
    width: '30%',
    height: '100%',
    borderRadius: 999,
  },
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularTrack: {
    position: 'absolute',
  },
  circularProgress: {
    position: 'absolute',
  },
  circularLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularLabelText: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    zIndex: 1,
  },
  stepError: {},
  stepCompleted: {},
  stepCurrent: {},
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepCompletedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepErrorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  stepLine: {
    position: 'absolute',
    top: 15,
    left: '50%',
    width: '100%',
    height: 2,
    zIndex: 0,
  },
});
