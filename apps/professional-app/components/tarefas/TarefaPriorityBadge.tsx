import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TarefaPrioridade } from '@/lib/api';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const PRIORITY_CONFIG: Record<TarefaPrioridade, { color: string; icon: IoniconsName; label: string }> = {
  BAIXA:   { color: '#16a34a', icon: 'arrow-down-outline',  label: 'Baixa' },
  MEDIA:   { color: '#2563eb', icon: 'remove-outline',       label: 'Média' },
  ALTA:    { color: '#d97706', icon: 'arrow-up-outline',     label: 'Alta' },
  URGENTE: { color: '#dc2626', icon: 'flame-outline',        label: 'Urgente' },
};

interface Props {
  prioridade: TarefaPrioridade;
  showLabel?: boolean;
}

export function TarefaPriorityBadge({ prioridade, showLabel = true }: Props) {
  const config = PRIORITY_CONFIG[prioridade] ?? PRIORITY_CONFIG.MEDIA;

  return (
    <View style={styles.row}>
      <Ionicons name={config.icon} size={14} color={config.color} />
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
