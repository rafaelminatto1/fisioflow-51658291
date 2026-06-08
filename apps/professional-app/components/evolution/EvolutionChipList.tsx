import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "@/types/theme";

export interface ChipItem {
  id: string;
  name: string;
  detail?: string;
}

interface EvolutionChipListProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  placeholder?: string;
  items: ChipItem[];
  onChange: (items: ChipItem[]) => void;
  colors: ThemeColors;
  /** Quando true, o input pede um detalhe adicional (ex.: prescrição). */
  withDetail?: boolean;
  detailPlaceholder?: string;
}

const randomId = () =>
  typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID
    ? globalThis.crypto.randomUUID()
    : `chip_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Lista compacta de itens estruturados (procedimentos / exercícios / medições /
 * exercícios para casa). Usa accent colorido por categoria, igual ao layout
 * Premium Grid do desktop.
 */
export function EvolutionChipList({
  title,
  icon,
  accent,
  placeholder,
  items,
  onChange,
  colors,
  withDetail = false,
  detailPlaceholder,
}: EvolutionChipListProps) {
  const [draftName, setDraftName] = useState("");
  const [draftDetail, setDraftDetail] = useState("");

  const handleAdd = () => {
    const name = draftName.trim();
    if (!name) return;
    onChange([
      ...items,
      {
        id: randomId(),
        name,
        ...(withDetail && draftDetail.trim() ? { detail: draftDetail.trim() } : {}),
      },
    ]);
    setDraftName("");
    setDraftDetail("");
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={[styles.accentStrip, { backgroundColor: accent }]} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <Ionicons name={icon} size={20} color={accent} />
          <Text style={[styles.label, { color: colors.text }]}>{title}</Text>
          {items.length > 0 ? (
            <Text style={[styles.count, { color: colors.textSecondary }]}>{items.length}</Text>
          ) : null}
        </View>

        {items.length > 0 ? (
          <View style={styles.chips}>
            {items.map((item) => (
              <View
                key={item.id}
                style={[styles.chip, { borderColor: accent, backgroundColor: colors.surface }]}
              >
                <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={2}>
                  {item.name}
                  {item.detail ? (
                    <Text style={{ color: colors.textSecondary }}> · {item.detail}</Text>
                  ) : null}
                </Text>
                <TouchableOpacity onPress={() => handleRemove(item.id)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, flex: 1 }]}
            placeholder={placeholder ?? `Adicionar ${title.toLowerCase()}...`}
            placeholderTextColor={colors.textMuted}
            value={draftName}
            onChangeText={setDraftName}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          {withDetail ? (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, width: 110 }]}
              placeholder={detailPlaceholder ?? "Detalhe"}
              placeholderTextColor={colors.textMuted}
              value={draftDetail}
              onChangeText={setDraftDetail}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
          ) : null}
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!draftName.trim()}
            style={[styles.addBtn, { backgroundColor: draftName.trim() ? accent : colors.border }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    overflow: "hidden",
  },
  accentStrip: {
    height: 4,
    width: "100%",
  },
  inner: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  count: {
    fontSize: 13,
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    maxWidth: 220,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
