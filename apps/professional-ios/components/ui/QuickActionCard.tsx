import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { HapticFeedback } from '@/lib/haptics';

export interface QuickActionCardProps {
  label: string;
  icon: string;
  color: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function QuickActionCard({
  label,
  icon,
  color,
  onPress,
  style,
}: QuickActionCardProps) {
  const handlePress = () => {
    HapticFeedback.light();
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }, style]}>
      <LinearGradient
        colors={[color, `${color}dd`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Icon name={icon as any} size={24} color="#fff" />
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    minHeight: 100,
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});
