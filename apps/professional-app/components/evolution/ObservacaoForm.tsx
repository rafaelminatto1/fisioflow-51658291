import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "@/types/theme";

interface ObservacaoFormProps {
  value: string;
  onChange: (text: string) => void;
  colors: ThemeColors;
  placeholder?: string;
}

/**
 * Editor único de observação clínica em texto livre.
 * Substitui o antigo SOAPForm (4 campos S/O/A/P) — o sistema agora opera
 * apenas com `sessions.observacao` + estruturados ao lado (EVA, procedimentos,
 * exercícios, medições, HEP, anexos).
 */
export function ObservacaoForm({ value, onChange, colors, placeholder }: ObservacaoFormProps) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={[styles.accentStrip, { backgroundColor: ACCENT }]} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <Ionicons name="document-text-outline" size={20} color={ACCENT} />
          <Text style={[styles.label, { color: colors.text }]}>Observação Clínica</Text>
        </View>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          placeholder={
            placeholder ?? "Descreva a evolução do paciente: queixa, evolução, análise, conduta..."
          }
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChange}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </View>
    </View>
  );
}

const ACCENT = "#F4B400"; // amarelo (faixa Observações)

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
  },
  input: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
});
