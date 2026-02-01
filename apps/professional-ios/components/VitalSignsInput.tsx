import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';

export interface VitalSignsInputProps {
  bloodPressure: string;
  onBloodPressureChange: (value: string) => void;
  heartRate: string;
  onHeartRateChange: (value: string) => void;
  temperature: string;
  onTemperatureChange: (value: string) => void;
  respiratoryRate: string;
  onRespiratoryRateChange: (value: string) => void;
  oxygenSaturation: string;
  onOxygenSaturationChange: (value: string) => void;
}

export function VitalSignsInput({
  bloodPressure,
  onBloodPressureChange,
  heartRate,
  onHeartRateChange,
  temperature,
  onTemperatureChange,
  respiratoryRate,
  onRespiratoryRateChange,
  oxygenSaturation,
  onOxygenSaturationChange,
}: VitalSignsInputProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.container}>
      <View style={styles.grid}>
        <VitalInput
          label="PA"
          placeholder="120/80"
          value={bloodPressure}
          onChangeText={onBloodPressureChange}
          icon="heart"
          unit="mmHg"
          colors={colors}
        />
        <VitalInput
          label="FC"
          placeholder="72"
          value={heartRate}
          onChangeText={onHeartRateChange}
          icon="activity"
          unit="bpm"
          keyboardType="number-pad"
          colors={colors}
        />
        <VitalInput
          label="Temp"
          placeholder="36.5"
          value={temperature}
          onChangeText={onTemperatureChange}
          icon="thermometer"
          unit="°C"
          keyboardType="decimal-pad"
          colors={colors}
        />
        <VitalInput
          label="FR"
          placeholder="16"
          value={respiratoryRate}
          onChangeText={onRespiratoryRateChange}
          icon="wind"
          unit="rpm"
          keyboardType="number-pad"
          colors={colors}
        />
        <VitalInput
          label="SpO2"
          placeholder="98"
          value={oxygenSaturation}
          onChangeText={onOxygenSaturationChange}
          icon="droplets"
          unit="%"
          keyboardType="number-pad"
          colors={colors}
        />
      </View>
    </Card>
  );
}

function VitalInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  unit,
  keyboardType = 'default',
  colors,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: string;
  unit?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  colors: any;
}) {
  return (
    <View style={styles.vitalItem}>
      <View style={styles.vitalHeader}>
        <Icon name={icon as any} size={16} color={colors.textSecondary} />
        <Text style={[styles.vitalLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <View style={[styles.vitalInputWrapper, { borderColor: colors.border }]}>
        <TextInput
          style={[styles.vitalInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
        />
        {unit && (
          <Text style={[styles.vitalUnit, { color: colors.textSecondary }]}>{unit}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  vitalItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  vitalLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  vitalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  vitalInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  vitalUnit: {
    fontSize: 12,
    marginLeft: 4,
  },
});
