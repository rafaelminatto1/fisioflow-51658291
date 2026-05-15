import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { stripHtml } from "@/lib/utils/stripHtml";

export interface EvolutionCardProps {
  date: string;
  therapistName: string;
  /** Texto principal — observação clínica (HTML será limpo na exibição). */
  observacao?: string;
  /** Aliases legados, usados como fallback se `observacao` estiver vazio. */
  subjective?: string;
  assessment?: string;
  sessionNumber?: number;
  /** Aceita tanto pain_scale quanto o legado pain_level. */
  painScale?: number | null;
  painLevel?: number;
  proceduresCount?: number;
  exercisesCount?: number;
  onClick?: () => void;
  compact?: boolean;
  style?: any;
}

export const EvolutionCard = React.forwardRef<View, EvolutionCardProps>(
  (
    {
      date,
      therapistName,
      observacao,
      subjective,
      assessment,
      sessionNumber,
      painScale,
      painLevel,
      proceduresCount,
      exercisesCount,
      onClick,
      compact = false,
      style,
      ...props
    },
    ref,
  ) => {
    const pain = painScale ?? painLevel ?? null;

    const getPainColor = (level: number) => {
      if (level > 7) return "#ef4444";
      if (level > 3) return "#f59e0b";
      return "#22c55e";
    };

    const getPainBg = (level: number) => {
      if (level > 7) return "#fee2e2";
      if (level > 3) return "#fef3c7";
      return "#dcfce7";
    };

    const previewRaw = observacao || subjective || assessment || "";
    const preview = previewRaw ? stripHtml(previewRaw) : "";

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onClick}
        activeOpacity={0.7}
        style={[styles.card, compact ? styles.compact : styles.normal, style]}
        {...props}
      >
        <View style={styles.header}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.dateText}>{date}</Text>
            {sessionNumber ? (
              <Text style={styles.sessionText}>• Sessão #{sessionNumber}</Text>
            ) : null}
          </View>
          {pain != null ? (
            <View style={[styles.badge, { backgroundColor: getPainBg(pain) }]}>
              <Text style={[styles.badgeText, { color: getPainColor(pain) }]}>
                EVA: {pain}/10
              </Text>
            </View>
          ) : null}
        </View>

        {preview ? (
          <View style={styles.content}>
            <Text style={styles.label}>OBSERVAÇÃO</Text>
            <Text style={styles.text} numberOfLines={compact ? 2 : 3}>
              {preview}
            </Text>
          </View>
        ) : null}

        {(proceduresCount || exercisesCount) && !compact ? (
          <View style={styles.countsRow}>
            {proceduresCount ? (
              <Text style={styles.countText}>{proceduresCount} procedimentos</Text>
            ) : null}
            {exercisesCount ? (
              <Text style={styles.countText}>{exercisesCount} exercícios</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Ionicons name="person-outline" size={12} color="#94a3b8" />
          <Text style={styles.footerText}>{therapistName}</Text>
        </View>
      </TouchableOpacity>
    );
  },
);

EvolutionCard.displayName = "EvolutionCard";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 8,
  },
  compact: { padding: 12 },
  normal: { padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateText: { fontSize: 14, fontWeight: "500", color: "#0f172a" },
  sessionText: { fontSize: 12, color: "#64748b" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  content: { gap: 4 },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  text: { fontSize: 14, color: "#64748b", lineHeight: 20 },
  countsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  countText: { fontSize: 12, color: "#94a3b8" },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerText: { fontSize: 12, color: "#94a3b8" },
});
