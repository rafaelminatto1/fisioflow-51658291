import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  color?: string;
  onPress?: () => void;
}

export function FilterChip({ label, selected, color, onPress }: FilterChipProps) {
  const { colors } = useTheme();

  const chipColor = color || colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? chipColor : colors.card,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? '#fff' : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
