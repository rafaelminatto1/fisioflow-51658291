import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "@/types/theme";
import { useHaptics } from "@/hooks/useHaptics";

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
  /** Ação opcional no cabeçalho (ex.: repetir prescrição anterior) */
  headerAction?: {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  /** Lista de atalhos pré-definidos de frequência/dosagem */
  frequencyPresets?: string[];
}

const DEFAULT_PRESETS = ["1x/dia", "2x/dia", "3x/semana", "Diariamente", "12/12h"];

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
  headerAction,
  frequencyPresets = DEFAULT_PRESETS,
}: EvolutionChipListProps) {
  const [draftName, setDraftName] = useState("");
  const [draftDetail, setDraftDetail] = useState("");
  const { selection, light } = useHaptics();

  const handleAdd = () => {
    const name = draftName.trim();
    if (!name) return;
    selection();
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
    light();
    onChange(items.filter((it) => it.id !== id));
  };

  const handleSelectPreset = (preset: string) => {
    selection();
    setDraftDetail(preset);
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={[styles.accentStrip, { backgroundColor: accent }]} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <Ionicons name={icon} size={20} color={accent} />
          <Text style={[styles.label, { color: colors.text }]}>{title}</Text>
          {items.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: accent + "20" }]}>
              <Text style={[styles.count, { color: accent }]}>{items.length}</Text>
            </View>
          ) : null}

          {headerAction ? (
            <TouchableOpacity
              onPress={headerAction.onPress}
              style={[styles.headerActionButton, { borderColor: accent + "40" }]}
              accessibilityRole="button"
              accessibilityLabel={headerAction.label}
            >
              <Ionicons name={headerAction.icon ?? "repeat-outline"} size={14} color={accent} />
              <Text style={[styles.headerActionText, { color: accent }]}>
                {headerAction.label}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {items.length > 0 ? (
          <View style={styles.chips}>
            {items.map((item) => (
              <View
                key={item.id}
                style={[styles.chip, { borderColor: accent + "60", backgroundColor: colors.background }]}
              >
                <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={2}>
                  {item.name}
                  {item.detail ? (
                    <Text style={{ color: accent, fontWeight: "600" }}> · {item.detail}</Text>
                  ) : null}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemove(item.id)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${item.name}`}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
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
            accessibilityRole="button"
            accessibilityLabel={`Adicionar ${title}`}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {withDetail ? (
          <View style={styles.presetsContainer}>
            <Text style={[styles.presetsTitle, { color: colors.textMuted }]}>Atalhos de dosagem:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {frequencyPresets.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  onPress={() => handleSelectPreset(preset)}
                  style={[
                    styles.presetChip,
                    {
                      borderColor: draftDetail === preset ? accent : colors.border,
                      backgroundColor: draftDetail === preset ? accent + "15" : colors.background,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Selecionar frequência ${preset}`}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: draftDetail === preset ? accent : colors.textSecondary },
                    ]}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
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
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  count: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerActionText: {
    fontSize: 12,
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
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  presetsContainer: {
    marginTop: 10,
    gap: 4,
  },
  presetsTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  presetsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: "500",
  },
});

