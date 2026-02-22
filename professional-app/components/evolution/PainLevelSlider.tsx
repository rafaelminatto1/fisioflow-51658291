import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface PainLevelSliderProps {
  painLevel: number;
  onValueChange: (value: number) => void;
  colors: any;
}

export function PainLevelSlider({ painLevel, onValueChange, colors }: PainLevelSliderProps) {
  const getPainColor = (level: number) => {
    if (level === 0) return colors.textMuted;
    if (level <= 3) return '#10B981'; // green
    if (level <= 6) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  const getPainLabel = (level: number) => {
    if (level === 0) return 'Sem dor';
    if (level <= 3) return 'Dor leve';
    if (level <= 6) return 'Dor moderada';
    return 'Dor intensa';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.text }]}>Nível de Dor</Text>
      <View style={styles.painDisplay}>
        <Text style={[styles.painValue, { color: getPainColor(painLevel) }]}>
          {painLevel}
        </Text>
        <Text style={[styles.painLabel, { color: colors.textSecondary }]}>
          {getPainLabel(painLevel)}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={painLevel}
        onValueChange={onValueChange}
        minimumTrackTintColor={getPainColor(painLevel)}
        maximumTrackTintColor={colors.border}
        thumbTintColor={getPainColor(painLevel)}
      />
      <View style={styles.scaleLabels}>
        <Text style={[styles.scaleLabel, { color: colors.textMuted }]}>0</Text>
        <Text style={[styles.scaleLabel, { color: colors.textMuted }]}>5</Text>
        <Text style={[styles.scaleLabel, { color: colors.textMuted }]}>10</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  painDisplay: {
    alignItems: 'center',
    marginBottom: 8,
  },
  painValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  painLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  scaleLabel: {
    fontSize: 12,
  },
});
