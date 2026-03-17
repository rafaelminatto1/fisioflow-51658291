import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { KanbanColumn } from './KanbanColumn';
import type { ApiTarefa, TarefaStatus } from '@/lib/api';

const VISIBLE_COLUMNS: TarefaStatus[] = ['BACKLOG', 'A_FAZER', 'EM_PROGRESSO', 'REVISAO', 'CONCLUIDO'];

interface Props {
  tarefas: ApiTarefa[];
  onMoveCard: (id: string, novoStatus: TarefaStatus) => void;
}

export function KanbanBoard({ tarefas, onMoveCard }: Props) {
  const byStatus = useMemo(() => {
    const map: Record<TarefaStatus, ApiTarefa[]> = {
      BACKLOG: [], A_FAZER: [], EM_PROGRESSO: [], REVISAO: [], CONCLUIDO: [], ARQUIVADO: [],
    };
    for (const t of tarefas) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [tarefas]);

  return (
    <ScrollView
      horizontal
      pagingEnabled={false}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {VISIBLE_COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tarefas={byStatus[status]}
          onMoveCard={onMoveCard}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
});
