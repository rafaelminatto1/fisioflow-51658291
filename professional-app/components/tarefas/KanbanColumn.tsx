import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TarefaCard } from './TarefaCard';
import type { ApiTarefa, TarefaStatus } from '@/lib/api';

const COLUMN_LABELS: Record<TarefaStatus, string> = {
  BACKLOG:      'Backlog',
  A_FAZER:      'A Fazer',
  EM_PROGRESSO: 'Em Progresso',
  REVISAO:      'Revisão',
  CONCLUIDO:    'Concluído',
  ARQUIVADO:    'Arquivado',
};

const COLUMN_COLORS: Record<TarefaStatus, string> = {
  BACKLOG:      '#94a3b8',
  A_FAZER:      '#3b82f6',
  EM_PROGRESSO: '#f59e0b',
  REVISAO:      '#8b5cf6',
  CONCLUIDO:    '#22c55e',
  ARQUIVADO:    '#94a3b8',
};

interface Props {
  status: TarefaStatus;
  tarefas: ApiTarefa[];
  onMoveCard: (id: string, novoStatus: TarefaStatus) => void;
}

export function KanbanColumn({ status, tarefas, onMoveCard }: Props) {
  const label = COLUMN_LABELS[status];
  const accentColor = COLUMN_COLORS[status];

  return (
    <View style={styles.column}>
      <View style={[styles.header, { borderTopColor: accentColor }]}>
        <Text style={styles.columnTitle}>{label}</Text>
        <View style={[styles.countBadge, { backgroundColor: accentColor + '22' }]}>
          <Text style={[styles.countText, { color: accentColor }]}>{tarefas.length}</Text>
        </View>
      </View>

      <FlatList
        data={tarefas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TarefaCard tarefa={item} onMoveCard={onMoveCard} />
        )}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.empty}>Sem tarefas</Text>
        }
      />

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push(`/tarefa-form?status=${status}`)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={16} color="#6b7280" />
        <Text style={styles.addBtnText}>Adicionar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 280,
    marginRight: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderTopWidth: 3,
    paddingTop: 10,
    borderRadius: 2,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  countBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginVertical: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 13,
    color: '#6b7280',
  },
});
