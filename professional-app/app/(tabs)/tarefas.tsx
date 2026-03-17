import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
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
  { label: 'Backlog',       value: 'BACKLOG' },
  { label: 'A Fazer',       value: 'A_FAZER' },
  { label: 'Em Progresso',  value: 'EM_PROGRESSO' },
  { label: 'Revisão',       value: 'REVISAO' },
  { label: 'Concluído',     value: 'CONCLUIDO' },
];

// ── Skeleton ────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.line1} />
      <View style={skeletonStyles.line2} />
      <View style={skeletonStyles.line3} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  line1: { height: 14, backgroundColor: '#e5e7eb', borderRadius: 4, width: '75%' },
  line2: { height: 12, backgroundColor: '#e5e7eb', borderRadius: 4, width: '45%' },
  line3: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 999, width: '100%' },
});

// ────────────────────────────────────────────────────────────────────────────

export default function TarefasScreen() {
  const colors = useColors();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterStatus, setFilterStatus] = useState<FilterOption>('TODAS');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch, update } = useTarefas();

  const filteredData = useMemo(
    () =>
      filterStatus === 'TODAS'
        ? data
        : data.filter((t) => t.status === filterStatus),
    [data, filterStatus]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleMoveCard = useCallback(
    (id: string, novoStatus: TarefaStatus) => {
      update({ id, data: { status: novoStatus } });
    },
    [update]
  );

  const renderItem = useCallback(
    ({ item }: { item: typeof data[number] }) => (
      <TarefaCard tarefa={item} onMoveCard={handleMoveCard} />
    ),
    [handleMoveCard]
  );

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && !isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={52} color={colors.textMuted} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Erro ao carregar</Text>
        <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
          {(error as Error).message || 'Tente novamente'}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tarefas</Text>
          {!isLoading && (
            <View style={[styles.totalBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.totalBadgeText, { color: colors.textMuted }]}>
                {data.length}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'list' && { backgroundColor: colors.primary + '22' }]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={18} color={viewMode === 'list' ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'kanban' && { backgroundColor: colors.primary + '22' }]}
            onPress={() => setViewMode('kanban')}
          >
            <Ionicons name="apps" size={18} color={viewMode === 'kanban' ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/tarefa-form')}
            accessibilityLabel="Criar nova tarefa"
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
            {FILTER_OPTIONS.map((opt) => {
              const active = filterStatus === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.filterPill,
                    { backgroundColor: active ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setFilterStatus(opt.value)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: active ? '#fff' : colors.textMuted },
                    ]}
                  >
                    {opt.label}
                    {opt.value !== 'TODAS' && !isLoading
                      ? ` (${data.filter((t) => t.status === opt.value).length})`
                      : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {isLoading ? (
            <ScrollView contentContainerStyle={styles.listContent}>
              {[1, 2, 3, 4].map((k) => <CardSkeleton key={k} />)}
            </ScrollView>
          ) : filteredData.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {filterStatus === 'TODAS' ? 'Nenhuma tarefa' : 'Nenhuma tarefa neste filtro'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {filterStatus === 'TODAS'
                  ? 'Crie sua primeira tarefa para começar'
                  : 'Tente outro filtro ou crie uma nova tarefa'}
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
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
            />
          )}
        </>
      ) : (
        isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <KanbanBoard tarefas={data} onMoveCard={handleMoveCard} />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  totalBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  totalBadgeText: { fontSize: 12, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewToggle: { padding: 6, borderRadius: 8 },
  addBtn: {
    width: 34, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  filtersScroll: { maxHeight: 50 },
  filtersContent: {
    paddingHorizontal: 16, paddingVertical: 8, gap: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, marginRight: 4,
  },
  filterPillText: { fontSize: 12, fontWeight: '500' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  errorTitle: { fontSize: 17, fontWeight: '600' },
  errorSubtitle: { fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
