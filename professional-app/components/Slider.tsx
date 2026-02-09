import React, { useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Props {
  minValue?: number;
  maxValue?: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
  showLabels?: boolean;
  marks?: { value: number; label: string }[];
}

export function Slider({
  minValue = 0,
  maxValue = 10,
  step = 1,
  value,
  onValueChange,
  label,
  showLabels = true,
  marks,
}: Props) {
  const colors = useColors();
  const [containerWidth, setContainerWidth] = useState(0);

  const percentage = ((value - minValue) / (maxValue - minValue)) * 100;
  const thumbPosition = (percentage / 100) * (containerWidth - 32);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (event) => {
      const newX = event.nativeEvent.locationX;
      const clampedX = Math.max(0, Math.min(newX, containerWidth - 32));
      const newPercentage = (clampedX / (containerWidth - 32)) * 100;
      const newValue = Math.round(minValue + (newPercentage / 100) * (maxValue - minValue));

      // Snap to step
      const steppedValue = Math.round(newValue / step) * step;
      const finalValue = Math.max(minValue, Math.min(maxValue, steppedValue));

      onValueChange(finalValue);
    },
  });

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}

      <View
        style={styles.sliderContainer}
        onLayout={(event) => {
          setContainerWidth(event.nativeEvent.layout.width);
        }}
      >
        {/* Track */}
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          {/* Progress */}
          <View
            style={[
              styles.progress,
              {
                backgroundColor: colors.primary,
                width: `${percentage}%`,
              },
            ]}
          />

          {/* Thumb */}
          <View
            {...panResponder.panHandlers}
            style={[
              styles.thumb,
              {
                backgroundColor: colors.surface,
                left: thumbPosition,
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={[styles.thumbInner, { backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Marks */}
        {marks && marks.map((mark) => {
          const markPercentage = ((mark.value - minValue) / (maxValue - minValue)) * 100;
          return (
            <View
              key={mark.value}
              style={[
                styles.mark,
                {
                  left: `${markPercentage}%`,
                },
              ]}
            >
              <View style={[styles.markLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.markLabel, { color: colors.textSecondary }]}>
                {mark.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Value Display */}
      <View style={styles.valueContainer}>
        {showLabels && (
          <>
            <Text style={[styles.minLabel, { color: colors.textSecondary }]}>
              {minValue}
            </Text>
            <View style={[styles.valueBubble, { backgroundColor: colors.primary }]}>
              <Text style={[styles.valueText, { color: '#FFFFFF' }]}>{value}</Text>
            </View>
            <Text style={[styles.maxLabel, { color: colors.textSecondary }]}>
              {maxValue}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  sliderContainer: {
    height: 32,
    position: 'relative',
    marginBottom: 8,
  },
  track: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
  },
  progress: {
    position: 'absolute',
    top: 14,
    left: 0,
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  mark: {
    position: 'absolute',
    top: 32,
    alignItems: 'center',
    transform: [{ translateX: -8 }],
  },
  markLine: {
    width: 1,
    height: 6,
  },
  markLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minLabel: {
    fontSize: 12,
  },
  maxLabel: {
    fontSize: 12,
  },
  valueBubble: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
});
