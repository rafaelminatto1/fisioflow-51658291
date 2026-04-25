import React, { useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TarefaCard } from "./TarefaCard";
import type { ApiTarefa, TarefaStatus } from "@/lib/api";

const COLUMN_META: Record<TarefaStatus, { label: string; accent: string }> = {
  BACKLOG: { label: "Backlog", accent: "#94a3b8" },
  A_FAZER: { label: "A Fazer", accent: "#3b82f6" },
  EM_PROGRESSO: { label: "Em Progresso", accent: "#f59e0b" },
  REVISAO: { label: "Revisão", accent: "#8b5cf6" },
  CONCLUIDO: { label: "Concluído", accent: "#22c55e" },
  ARQUIVADO: { label: "Arquivado", accent: "#94a3b8" },
};

interface Props {
  status: TarefaStatus;
  tarefas: ApiTarefa[];
  onMoveCard: (id: string, novoStatus: TarefaStatus) => void;
}

export function KanbanColumn({ status, tarefas, onMoveCard }: Props) {
  const { label, accent } = COLUMN_META[status];

  const renderItem = useCallback(
    ({ item }: { item: ApiTarefa }) => <TarefaCard tarefa={item} onMoveCard={onMoveCard} />,
    [onMoveCard],
  );

  return (
    <View style={styles.column}>
      <View style={[styles.headerBar, { backgroundColor: accent }]} />
      <View style={styles.header}>
        <Text style={styles.columnTitle}>{label}</Text>
        <View style={[styles.countBadge, { backgroundColor: accent + "28" }]}>
          <Text style={[styles.countText, { color: accent }]}>{tarefas.length}</Text>
        </View>
      </View>

      <FlatList
        data={tarefas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sem tarefas</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push(`/tarefa-form?status=${status}`)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={15} color="#6b7280" />
        <Text style={styles.addBtnText}>Adicionar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 280,
    marginRight: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    overflow: "hidden",
  },
  headerBar: {
    height: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.2,
  },
  countBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    justifyContent: "center",
  },
  addBtnText: {
    fontSize: 12,
    color: "#6b7280",
  },
});
