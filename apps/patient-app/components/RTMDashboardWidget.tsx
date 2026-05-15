import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { useColors } from "../hooks/useColorScheme";
import { useRTM } from "../hooks/useRTM";
import { CircularProgress } from "./Progress";

export function RTMDashboardWidget() {
  const colors = useColors();
  const { data, isLoading, error, refresh } = useRTM();

  if (isLoading && !data) {
    return (
      <Card style={styles.loadingCard}>
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  if (error || !data) {
    return null; // Don't show if there's an error or no data (e.g. no wearable connected)
  }

  const getStatusColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.error;
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="fitness" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Monitoramento de Saúde</Text>
        </View>
        <TouchableOpacity onPress={refresh} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.scoreContainer}>
          <CircularProgress
            progress={data.engagementScore / 100}
            size={70}
            thickness={6}
            color={getStatusColor(data.engagementScore)}
            showLabel
            label={Math.round(data.engagementScore).toString()}
            labelStyle={{
              fontSize: 20,
              fontWeight: "800",
              color: getStatusColor(data.engagementScore),
            }}
          />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="footsteps" size={16} color={colors.textSecondary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {data.trends.steps.toLocaleString()}
            </Text>
            <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>Passos</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color={colors.textSecondary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {data.trends.activeMinutes}m
            </Text>
            <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>Ativo</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons name="checkmark-done" size={16} color={colors.textSecondary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {data.milestones.completed}/{data.milestones.total}
            </Text>
            <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>Marcos</Text>
          </View>
        </View>
      </View>

      {data.status === "at_risk" && (
        <View style={[styles.alertContainer, { backgroundColor: colors.error + "10" }]}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.alertText, { color: colors.error }]}>
            Sua atividade diminuiu. Que tal um alongamento hoje?
          </Text>
        </View>
      )}

      {data.milestones.nextMilestone && (
        <Text style={[styles.nextMilestone, { color: colors.textSecondary }]}>
          Próximo objetivo: {data.milestones.nextMilestone}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  loadingCard: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  scoreContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  statLabelSmall: {
    fontSize: 10,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "#eee",
  },
  alertContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  alertText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  nextMilestone: {
    fontSize: 11,
    marginTop: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
});
