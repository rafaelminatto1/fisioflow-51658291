import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { TarefaPriorityBadge } from './TarefaPriorityBadge';
import type { ApiTarefa, TarefaStatus } from '@/lib/api';

const COLUMN_OPTIONS: { label: string; status: TarefaStatus }[] = [
  { label: 'Backlog',      status: 'BACKLOG' },
  { label: 'A Fazer',      status: 'A_FAZER' },
  { label: 'Em Progresso', status: 'EM_PROGRESSO' },
  { label: 'Revisão',      status: 'REVISAO' },
  { label: 'Concluído',    status: 'CONCLUIDO' },
];

interface Props {
  tarefa: ApiTarefa;
  onMoveCard?: (id: string, novoStatus: TarefaStatus) => void;
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function checklistSummary(tarefa: ApiTarefa): { total: number; done: number } {
  if (!tarefa.checklists?.length) return { total: 0, done: 0 };
  let total = 0;
  let done = 0;
  for (const cl of tarefa.checklists) {
    for (const item of cl.items) {
      total++;
      if (item.completed) done++;
    }
  }
  return { total, done };
}

export function TarefaCard({ tarefa, onMoveCard }: Props) {
  const overdue = isOverdue(tarefa.data_vencimento);
  const { total, done } = checklistSummary(tarefa);
  const tags = tarefa.tags?.slice(0, 2) ?? [];
  const progress = tarefa.progress ?? 0;

  function handleLongPress() {
    if (!onMoveCard) return;
    const options = COLUMN_OPTIONS.filter((o) => o.status !== tarefa.status);
    Alert.alert(
      'Mover para',
      undefined,
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
    >
      <Text style={styles.titulo} numberOfLines={2}>
        {tarefa.titulo}
      </Text>

      <View style={styles.meta}>
        <TarefaPriorityBadge prioridade={tarefa.prioridade} showLabel={false} />
        {tarefa.data_vencimento && (
          <Text style={[styles.date, overdue && styles.dateOverdue]}>
            {formatDate(tarefa.data_vencimento)}
          </Text>
        )}
      </View>

      {progress > 0 && (
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` as any }]} />
        </View>
      )}

      {(total > 0 || tags.length > 0) && (
        <View style={styles.footer}>
          {total > 0 && (
            <Text style={styles.checklist}>
              ✓ {done}/{total}
            </Text>
          )}
          <View style={styles.tags}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
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
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
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
    fontWeight: '500',
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
    gap: 8,
    marginTop: 4,
  },
  checklist: {
    fontSize: 11,
    color: '#6b7280',
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
});
