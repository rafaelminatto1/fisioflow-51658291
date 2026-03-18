import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

export const Bar = ({ label, value, maxValue, color }: BarProps) => {
  const colors = useColors();
  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <View style={styles.barContainer}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { height: `${height}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 64) / 5,
  },
  barTrack: {
    width: 24,
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
