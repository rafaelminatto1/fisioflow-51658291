import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTarefas } from '@/hooks/useTarefas';
import { TarefaStatusBadge } from '@/components/tarefas/TarefaStatusBadge';
import { TarefaPriorityBadge } from '@/components/tarefas/TarefaPriorityBadge';
import { useColors } from '@/hooks/useColorScheme';
import { formatDateFull, isOverdue, genLocalId } from '@/lib/tarefas';
import type { ApiTarefaChecklist, ApiTarefaChecklistItem } from '@/lib/api';

export default function TarefaDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: allData, isLoading, updateAsync, deleteAsync, isUpdating, isDeleting } = useTarefas();

  const tarefa = allData.find((t) => t.id === id);

  const [checklists, setChecklists] = useState<ApiTarefaChecklist[]>([]);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [addingToChecklist, setAddingToChecklist] = useState<string | null>(null);

  // Sync local checklist state quando tarefa muda no cache
  React.useEffect(() => {
    if (tarefa) setChecklists(tarefa.checklists ?? []);
  }, [tarefa?.id, tarefa?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleChecklistItem = useCallback(
    async (clId: string, itemId: string) => {
      if (!tarefa) return;
      const updated = (tarefa.checklists ?? []).map((cl: ApiTarefaChecklist) => {
        if (cl.id !== clId) return cl;
        return {
          ...cl,
          items: cl.items.map((item: ApiTarefaChecklistItem) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          ),
        };
      });
      setChecklists(updated);
      try {
        await updateAsync({ id: tarefa.id, data: { checklists: updated } });
      } catch {
        setChecklists(tarefa.checklists ?? []);
        Alert.alert('Erro', 'Não foi possível atualizar o item.');
      }
    },
    [tarefa, updateAsync]
  );

  const addChecklistItem = useCallback(
    async (clId: string) => {
      if (!tarefa) return;
      const text = (newItemText[clId] ?? '').trim();
      if (!text) return;

      setAddingToChecklist(clId);
      const newItem: ApiTarefaChecklistItem = {
        id: genLocalId(),
        text,
        completed: false,
      };
      const updated = (tarefa.checklists ?? []).map((cl: ApiTarefaChecklist) => {
        if (cl.id !== clId) return cl;
        return { ...cl, items: [...cl.items, newItem] };
      });
      setChecklists(updated);
      setNewItemText((prev) => ({ ...prev, [clId]: '' }));

      try {
        await updateAsync({ id: tarefa.id, data: { checklists: updated } });
      } catch {
        setChecklists(tarefa.checklists ?? []);
        Alert.alert('Erro', 'Não foi possível adicionar o item.');
      } finally {
        setAddingToChecklist(null);
      }
    },
    [tarefa, newItemText, updateAsync]
  );

  const handleDelete = useCallback(() => {
    if (!tarefa) return;
    Alert.alert(
      'Excluir tarefa',
      `Deseja excluir "${tarefa.titulo}"?\nEsta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAsync(tarefa.id);
              router.back();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Erro desconhecido';
              Alert.alert('Erro ao excluir', msg);
            }
          },
        },
      ]
    );
  }, [tarefa, deleteAsync]);

  // ── Render states ─────────────────────────────────────────────────────────

  const headerOpts = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '600' as const },
  };

  if (isLoading && !tarefa) {
    return (
      <>
        <Stack.Screen options={{ title: 'Tarefa', ...headerOpts }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (!tarefa) {
    return (
      <>
        <Stack.Screen options={{ title: 'Não encontrada', ...headerOpts }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Ionicons name="alert-circle-outline" size={52} color={colors.textMuted} />
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>Tarefa não encontrada</Text>
          <Text style={[styles.notFoundSub, { color: colors.textMuted }]}>
            A tarefa foi excluída ou não está disponível.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const progress = tarefa.progress ?? 0;
  const overdue = isOverdue(tarefa.data_vencimento ?? undefined);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tarefa',
          ...headerOpts,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/tarefa-form?id=${tarefa.id}`)}
              style={{ marginRight: 8, padding: 4 }}
              accessibilityLabel="Editar tarefa"
            >
              <Ionicons name="pencil-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Título */}
        <Text style={[styles.title, { color: colors.text }]}>{tarefa.titulo}</Text>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <TarefaStatusBadge status={tarefa.status} />
          <TarefaPriorityBadge prioridade={tarefa.prioridade} />
          {tarefa.tipo && (
            <View style={[styles.tipoBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.tipoBadgeText, { color: colors.textMuted }]}>{tarefa.tipo}</Text>
            </View>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Datas */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DATAS</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={[styles.dateLabel, { color: colors.textMuted }]}>Início</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {formatDateFull(tarefa.start_date ?? undefined)}
              </Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={[styles.dateLabel, { color: colors.textMuted }]}>Vencimento</Text>
              <Text style={[styles.dateValue, { color: overdue ? '#dc2626' : colors.text }]}>
                {overdue ? '⚠ ' : ''}{formatDateFull(tarefa.data_vencimento ?? undefined)}
              </Text>
            </View>
            {tarefa.completed_at && (
              <View style={styles.dateItem}>
                <Text style={[styles.dateLabel, { color: colors.textMuted }]}>Concluído</Text>
                <Text style={[styles.dateValue, { color: '#16a34a' }]}>
                  {formatDateFull(tarefa.completed_at ?? undefined)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Progresso */}
        {progress > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.section}>
              <View style={styles.progressHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PROGRESSO</Text>
                <Text style={[styles.progressPct, { color: colors.primary }]}>{progress}%</Text>
              </View>
              <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(progress, 100)}%` as any, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>
          </>
        )}

        {/* Descrição */}
        {tarefa.descricao ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DESCRIÇÃO</Text>
              <Text style={[styles.description, { color: colors.text }]}>{tarefa.descricao}</Text>
            </View>
          </>
        ) : null}

        {/* Checklists */}
        {checklists.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CHECKLISTS</Text>
              {checklists.map((cl) => {
                const done = cl.items.filter((i: ApiTarefaChecklistItem) => i.completed).length;
                const isAddingHere = addingToChecklist === cl.id;
                return (
                  <View key={cl.id} style={[styles.checklist, { borderColor: colors.border }]}>
                    <View style={[styles.checklistHeader, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.checklistTitle, { color: colors.text }]}>{cl.title}</Text>
                      <Text style={[styles.checklistCount, {
                        color: done === cl.items.length && cl.items.length > 0 ? '#16a34a' : colors.textMuted,
                      }]}>
                        {done}/{cl.items.length}
                      </Text>
                    </View>
                    {cl.items.map((item: ApiTarefaChecklistItem) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.checklistItem}
                        onPress={() => toggleChecklistItem(cl.id, item.id)}
                        activeOpacity={0.7}
                        disabled={isUpdating}
                      >
                        <Ionicons
                          name={item.completed ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={item.completed ? colors.primary : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.checklistItemText,
                            { color: item.completed ? colors.textMuted : colors.text },
                            item.completed && styles.strikethrough,
                          ]}
                          numberOfLines={3}
                        >
                          {item.text}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <View style={[styles.addItemRow, { borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.addItemInput, { color: colors.text }]}
                        value={newItemText[cl.id] ?? ''}
                        onChangeText={(v) =>
                          setNewItemText((prev) => ({ ...prev, [cl.id]: v }))
                        }
                        placeholder="Novo item…"
                        placeholderTextColor={colors.textMuted}
                        returnKeyType="done"
                        onSubmitEditing={() => addChecklistItem(cl.id)}
                        blurOnSubmit={false}
                        editable={!isAddingHere}
                      />
                      {isAddingHere ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                      ) : (
                        <TouchableOpacity
                          onPress={() => addChecklistItem(cl.id)}
                          disabled={!(newItemText[cl.id] ?? '').trim()}
                          style={{ opacity: (newItemText[cl.id] ?? '').trim() ? 1 : 0.3, padding: 4 }}
                        >
                          <Ionicons name="add-circle" size={26} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Tags */}
        {tarefa.tags && tarefa.tags.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TAGS</Text>
              <View style={styles.tagsRow}>
                {tarefa.tags.map((tag: string) => (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.tagChipText, { color: colors.textMuted }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Excluir */}
        <TouchableOpacity
          style={[styles.deleteBtn, isDeleting && styles.btnDisabled]}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#dc2626" size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text style={styles.deleteBtnText}>Excluir tarefa</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  notFoundTitle: { fontSize: 17, fontWeight: '600' },
  notFoundSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  backBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 28, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  tipoBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tipoBadgeText: { fontSize: 11, fontWeight: '500' },
  divider: { height: 1, marginVertical: 16 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  dateRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  dateItem: { minWidth: 90 },
  dateLabel: { fontSize: 11, fontWeight: '500', marginBottom: 3 },
  dateValue: { fontSize: 14, fontWeight: '500' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressPct: { fontSize: 14, fontWeight: '700' },
  progressBg: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  description: { fontSize: 15, lineHeight: 23 },
  checklist: { marginBottom: 12, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  checklistHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  checklistTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  checklistCount: { fontSize: 12, fontWeight: '600' },
  checklistItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  checklistItemText: { fontSize: 14, flex: 1, paddingTop: 1, lineHeight: 20 },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.5 },
  addItemRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 6, gap: 8,
  },
  addItemInput: { flex: 1, fontSize: 14, paddingVertical: 6 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagChipText: { fontSize: 12 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fff5f5',
  },
  deleteBtnText: { fontSize: 15, color: '#dc2626', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
