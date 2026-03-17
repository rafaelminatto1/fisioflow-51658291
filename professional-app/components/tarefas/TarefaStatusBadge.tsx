import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TarefaStatus } from '@/lib/api';

const STATUS_CONFIG: Record<TarefaStatus, { bg: string; text: string; label: string }> = {
  BACKLOG:      { bg: '#e2e8f0', text: '#475569', label: 'Backlog' },
  A_FAZER:      { bg: '#dbeafe', text: '#1d4ed8', label: 'A Fazer' },
  EM_PROGRESSO: { bg: '#fef3c7', text: '#d97706', label: 'Em Progresso' },
  REVISAO:      { bg: '#ede9fe', text: '#7c3aed', label: 'Revisão' },
  CONCLUIDO:    { bg: '#dcfce7', text: '#16a34a', label: 'Concluído' },
  ARQUIVADO:    { bg: '#f1f5f9', text: '#94a3b8', label: 'Arquivado' },
};

interface Props {
  status: TarefaStatus;
  size?: 'sm' | 'md';
}

export function TarefaStatusBadge({ status, size = 'md' }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.BACKLOG;
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSmall && styles.badgeSm]}>
      <Text style={[styles.label, { color: config.text }, isSmall && styles.labelSm]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
});
