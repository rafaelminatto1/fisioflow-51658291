import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { TarefaPriorityBadge } from './TarefaPriorityBadge';
import { formatDateShort, isOverdue } from '@/lib/tarefas';
import type { ApiTarefa, TarefaStatus } from '@/lib/api';

const COLUMN_MOVE_OPTIONS: { label: string; status: TarefaStatus }[] = [
  { label: 'Backlog',      status: 'BACKLOG' },
  { label: 'A Fazer',      status: 'A_FAZER' },
  { label: 'Em Progresso', status: 'EM_PROGRESSO' },
  { label: 'Revisão',      status: 'REVISAO' },
  { label: 'Concluído',    status: 'CONCLUIDO' },
];

function checklistSummary(tarefa: ApiTarefa): { total: number; done: number } {
  if (!tarefa.checklists?.length) return { total: 0, done: 0 };
  let total = 0, done = 0;
  for (const cl of tarefa.checklists) {
    for (const item of cl.items) {
      total++;
      if (item.completed) done++;
    }
  }
  return { total, done };
}

interface Props {
  tarefa: ApiTarefa;
  onMoveCard?: (id: string, novoStatus: TarefaStatus) => void;
}

export function TarefaCard({ tarefa, onMoveCard }: Props) {
  const overdue = isOverdue(tarefa.data_vencimento ?? undefined);
  const { total, done } = checklistSummary(tarefa);
  const tags = tarefa.tags ?? [];
  const visibleTags = tags.slice(0, 2);
  const hiddenTagsCount = tags.length - visibleTags.length;
  const progress = tarefa.progress ?? 0;

  function handleLongPress() {
    if (!onMoveCard) return;
    const options = COLUMN_MOVE_OPTIONS.filter((o) => o.status !== tarefa.status);
    Alert.alert(
      'Mover para coluna',
      `"${tarefa.titulo.slice(0, 40)}${tarefa.titulo.length > 40 ? '…' : ''}"`,
      [
        ...options.map((opt) => ({
          text: opt.label,
          onPress: () => onMoveCard(tarefa.id, opt.status),
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/tarefa-detail?id=${tarefa.id}`)}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
      <Text style={styles.titulo} numberOfLines={2}>
        {tarefa.titulo}
      </Text>

      <View style={styles.meta}>
        <TarefaPriorityBadge prioridade={tarefa.prioridade} showLabel={false} />
        {tarefa.data_vencimento ? (
          <Text style={[styles.date, overdue && styles.dateOverdue]}>
            {overdue ? '⚠ ' : ''}{formatDateShort(tarefa.data_vencimento ?? undefined)}
          </Text>
        ) : null}
      </View>

      {progress > 0 && (
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` as any }]} />
        </View>
      )}

      {(total > 0 || visibleTags.length > 0) && (
        <View style={styles.footer}>
          {total > 0 && (
            <Text style={[styles.checklist, done === total && styles.checklistDone]}>
              ✓ {done}/{total}
            </Text>
          )}
          <View style={styles.tags}>
            {visibleTags.map((tag: string) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {hiddenTagsCount > 0 && (
              <View style={styles.tagMore}>
                <Text style={styles.tagMoreText}>+{hiddenTagsCount}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
  },
  dateOverdue: {
    color: '#dc2626',
    fontWeight: '600',
  },
  progressBg: {
    height: 3,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 999,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  checklist: {
    fontSize: 11,
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  checklistDone: {
    color: '#16a34a',
  },
  tags: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    color: '#64748b',
  },
  tagMore: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagMoreText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
});
