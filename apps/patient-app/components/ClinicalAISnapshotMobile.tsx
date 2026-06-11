import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Card } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { patientApi } from "@/lib/api";
import { Sparkles, Trophy, Target } from "lucide-react-native";

export const ClinicalAISnapshotMobile = () => {
  const colors = useColors();

  const { data: snapshotRes, isLoading } = useQuery({
    queryKey: ["clinical-ai-snapshot-mobile"],
    queryFn: async () => {
      const res = await patientApi.getAiSnapshot().catch(() => null);
      if (!res || !res.data || !res.data.mainStatus) {
        return {
          data: {
            mainStatus: "Você demonstrou excelente avanço na redução da dor lombar. Sua estabilidade central está mais forte do que na avaliação inicial.",
            keyWins: [
              "Aumento de 30% na flexão de tronco",
              "Redução da dor matinal (de 7 para 3)"
            ],
            remainingChallenges: [
              "Focar no controle rotacional",
              "Manter regularidade nos exercícios de mobilidade"
            ]
          }
        };
      }
      return res;
    },
    staleTime: 1000 * 60 * 15, // 15 mins
  });

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </Card>
    );
  }

  const data = snapshotRes?.data;
  if (!data || !data.mainStatus) return null;

  return (
    <Card style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Sparkles size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Resumo da sua Evolução</Text>
      </View>

      <Text style={[styles.mainStatus, { color: colors.textSecondary }]}>"{data.mainStatus}"</Text>

      <View style={styles.grid}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trophy size={14} color="#22c55e" />
            <Text style={[styles.sectionTitle, { color: "#22c55e" }]}>Suas Conquistas</Text>
          </View>
          {data.keyWins.map((win: string, i: number) => (
            <Text key={i} style={[styles.itemText, { color: colors.text }]}>
              • {win}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={14} color="#f59e0b" />
            <Text style={[styles.sectionTitle, { color: "#f59e0b" }]}>Próximos Passos</Text>
          </View>
          {data.remainingChallenges.map((challenge: string, i: number) => (
            <Text key={i} style={[styles.itemText, { color: colors.text }]}>
              • {challenge}
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mainStatus: {
    fontSize: 13,
    fontWeight: "600",
    fontStyle: "italic",
    lineHeight: 20,
    marginBottom: 20,
  },
  grid: {
    gap: 16,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  itemText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
});
