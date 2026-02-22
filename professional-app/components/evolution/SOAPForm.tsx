import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SOAPFormProps {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  onChangeSubjective: (text: string) => void;
  onChangeObjective: (text: string) => void;
  onChangeAssessment: (text: string) => void;
  onChangePlan: (text: string) => void;
  colors: any;
}

const SOAP_SECTIONS = [
  { key: 'subjective', label: 'Subjetivo (S)', placeholder: 'Queixas e sintomas relatados pelo paciente...', icon: 'chatbubble-outline' },
  { key: 'objective', label: 'Objetivo (O)', placeholder: 'Observações clínicas, testes realizados...', icon: 'eye-outline' },
  { key: 'assessment', label: 'Avaliação (A)', placeholder: 'Análise e diagnóstico fisioterapêutico...', icon: 'analytics-outline' },
  { key: 'plan', label: 'Plano (P)', placeholder: 'Condutas e orientações para próximas sessões...', icon: 'clipboard-outline' },
];

export function SOAPForm({
  subjective,
  objective,
  assessment,
  plan,
  onChangeSubjective,
  onChangeObjective,
  onChangeAssessment,
  onChangePlan,
  colors,
}: SOAPFormProps) {
  const values: Record<string, string> = { subjective, objective, assessment, plan };
  const handlers: Record<string, (text: string) => void> = {
    subjective: onChangeSubjective,
    objective: onChangeObjective,
    assessment: onChangeAssessment,
    plan: onChangePlan,
  };

  return (
    <View style={styles.container}>
      {SOAP_SECTIONS.map((section) => (
        <View key={section.key} style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name={section.icon as any} size={20} color={colors.primary} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>{section.label}</Text>
          </View>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder={section.placeholder}
            placeholderTextColor={colors.textMuted}
            value={values[section.key]}
            onChangeText={handlers[section.key]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
});
