import React from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { TarefaPriorityBadge } from "./TarefaPriorityBadge";
import { formatDateShort, isOverdue } from "@/lib/tarefas";
import type { ApiTarefa, TarefaStatus } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";

const COLUMN_MOVE_OPTIONS: { label: string; status: TarefaStatus }[] = [
  { label: "Backlog", status: "BACKLOG" },
  { label: "A Fazer", status: "A_FAZER" },
  { label: "Em Progresso", status: "EM_PROGRESSO" },
  { label: "Revisão", status: "REVISAO" },
  { label: "Concluído", status: "CONCLUIDO" },
];

function checklistSummary(tarefa: ApiTarefa): { total: number; done: number } {
  if (!tarefa.checklists?.length) return { total: 0, done: 0 };
  let total = 0,
    done = 0;
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
  const colors = useColors();
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
      "Mover para coluna",
      `"${tarefa.titulo.slice(0, 40)}${tarefa.titulo.length > 40 ? "…" : ""}"`,
      [
        ...options.map((opt) => ({
          text: opt.label,
          onPress: () => onMoveCard(tarefa.id, opt.status),
        })),
        { text: "Cancelar", style: "cancel" },
      ],
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: colors.border }]}
      activeOpacity={0.75}
      onPress={() => router.push(`/tarefa-detail?id=${tarefa.id}`)}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
      <View style={styles.header}>
        <Text style={[styles.titulo, { color: colors.text }]} numberOfLines={2}>
          {tarefa.titulo}
        </Text>
        <TarefaPriorityBadge prioridade={tarefa.prioridade} showLabel={false} />
      </View>

      <View style={styles.meta}>
        {tarefa.data_vencimento ? (
          <View style={styles.dateContainer}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={overdue ? colors.error : colors.textSecondary}
            />
            <Text style={[styles.date, overdue && { color: colors.error, fontWeight: "700" }]}>
              {formatDateShort(tarefa.data_vencimento ?? undefined)}
            </Text>
          </View>
        ) : null}

        {total > 0 && (
          <View style={styles.checklistContainer}>
            <Ionicons
              name="checkbox-outline"
              size={12}
              color={done === total ? colors.success : colors.textSecondary}
            />
            <Text
              style={[
                styles.checklist,
                done === total && { color: colors.success, fontWeight: "700" },
              ]}
            >
              {done}/{total}
            </Text>
          </View>
        )}
      </View>

      {progress > 0 && (
        <View style={[styles.progressBg, { backgroundColor: colors.border + "50" }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress, 100)}%` as any,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
      )}

      {visibleTags.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.tags}>
            {visibleTags.map((tag: string) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + "10" }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
            {hiddenTagsCount > 0 && (
              <View style={[styles.tagMore, { backgroundColor: colors.border + "50" }]}>
                <Text style={[styles.tagMoreText, { color: colors.textSecondary }]}>
                  +{hiddenTagsCount}
                </Text>
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
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  titulo: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    lineHeight: 20,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: "#64748b",
  },
  checklistContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  checklist: {
    fontSize: 12,
    color: "#64748b",
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  tags: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    flexWrap: "wrap",
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tagMore: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tagMoreText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
