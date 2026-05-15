import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Card } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { patientApi } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";

export const RecoveryTrajectoryMobileWidget = () => {
  const colors = useColors();

  const { data: twinResponse, isLoading } = useQuery({
    queryKey: ["patient-digital-twin-mobile"],
    queryFn: () => patientApi.getDigitalTwin(),
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </Card>
    );
  }

  const data = twinResponse;
  if (!data || !data.predicted_recovery_weeks) return null;

  const adherence = Math.round(parseFloat(data.adherence_score) || 0);

  return (
    <Card
      style={[
        styles.container,
        {
          backgroundColor: colors.surface + "B0",
          borderColor: colors.primary + "30",
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="analytics" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Sua Trajetória de Recuperação</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Previsão de Alta</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {data.predicted_recovery_weeks}
            </Text>
            <Text style={[styles.statUnit, { color: colors.textSecondary }]}> semanas</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Aderência</Text>
          <Text style={[styles.statValue, { color: "#22c55e" }]}>{adherence}%</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.primary,
                width: `${adherence}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Continue assim! Seu progresso está acima da média para sua condição.
        </Text>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: "bold",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  statUnit: {
    fontSize: 12,
    fontWeight: "bold",
  },
  divider: {
    width: 1,
    height: 30,
    marginHorizontal: 10,
  },
  progressContainer: {
    gap: 10,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  helperText: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
    textAlign: "center",
  },
});
