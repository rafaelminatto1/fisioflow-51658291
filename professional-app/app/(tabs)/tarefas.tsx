import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTarefas } from '@/hooks/useTarefas';
import { TarefaCard } from '@/components/tarefas/TarefaCard';
import { KanbanBoard } from '@/components/tarefas/KanbanBoard';
import { useColors } from '@/hooks/useColorScheme';
import type { TarefaStatus } from '@/lib/api';

type FilterOption = TarefaStatus | 'TODAS';

const FILTER_OPTIONS: { label: string; value: FilterOption }[] = [
  { label: 'Todas',         value: 'TODAS' },
  { label: 'A Fazer',       value: 'A_FAZER' },
  { label: 'Em Progresso',  value: 'EM_PROGRESSO' },
  { label: 'Revisão',       value: 'REVISAO' },
  { label: 'Concluído',     value: 'CONCLUIDO' },
];

export default function TarefasScreen() {
  const colors = useColors();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterStatus, setFilterStatus] = useState<FilterOption>('TODAS');
  const [refreshing, setRefreshing] = useState(false);

  const { allData, isLoading, refetch, update } = useTarefas();

  const filteredData =
    filterStatus === 'TODAS'
      ? allData
      : allData.filter((t) => t.status === filterStatus);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function handleMoveCard(id: string, novoStatus: TarefaStatus) {
    update({ id, data: { status: novoStatus } });
  }

  const isEmpty = filteredData.length === 0 && !isLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tarefas</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'list' && styles.viewToggleActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={18} color={viewMode === 'list' ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'kanban' && styles.viewToggleActive]}
            onPress={() => setViewMode('kanban')}
          >
            <Ionicons name="apps" size={18} color={viewMode === 'kanban' ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/tarefa-form')}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'list' ? (
        <>
          {/* Filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            {FILTER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.filterPill,
                  filterStatus === opt.value && { backgroundColor: colors.primary },
                ]}
                onPress={() => setFilterStatus(opt.value)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    filterStatus === opt.value
                      ? { color: '#fff' }
                      : { color: colors.textMuted },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {isEmpty ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma tarefa</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Crie sua primeira tarefa para começar
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/tarefa-form')}
              >
                <Text style={styles.emptyBtnText}>Criar tarefa</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredData}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TarefaCard tarefa={item} onMoveCard={handleMoveCard} />
              )}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          )}
        </>
      ) : (
        <KanbanBoard tarefas={allData} onMoveCard={handleMoveCard} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggle: {
    padding: 6,
    borderRadius: 8,
  },
  viewToggleActive: {
    backgroundColor: '#e0e7ff',
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScroll: {
    maxHeight: 48,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    marginRight: 4,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
