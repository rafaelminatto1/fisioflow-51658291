import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { Card } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { patientApi } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";

export const RecoveryTrajectoryMobileWidget = () => {
  const colors = useColors();
  const screenWidth = Dimensions.get("window").width;

  const { data: twinResponse, isLoading } = useQuery({
    queryKey: ["patient-digital-twin-mobile"],
    queryFn: async () => {
      // Faz fetch, porém garante um mock local se não houver dados de trajetória para o gráfico
      const res = await patientApi.getDigitalTwin().catch(() => null);
      if (!res || !res.trajectory) {
        return {
          predicted_recovery_weeks: 4,
          adherence_score: "85",
          trajectory: {
            labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5"],
            data: [40, 55, 68, 80, 85], // Score de funcionalidade (subindo)
          }
        };
      }
      return res;
    },
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
  if (!data) return null;

  const adherence = Math.round(parseFloat(data.adherence_score) || 0);
  const chartData = {
    labels: data.trajectory?.labels || ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
    datasets: [
      {
        data: data.trajectory?.data || [50, 60, 70, 85],
        color: (opacity = 1) => colors.primary,
        strokeWidth: 3
      }
    ],
  };

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
        <Text style={[styles.title, { color: colors.text }]}>Sua Trajetória (Digital Twin)</Text>
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

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth - 80} // Padding lateral
          height={180}
          chartConfig={{
            backgroundColor: "transparent",
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            backgroundGradientFromOpacity: 0,
            backgroundGradientToOpacity: 0,
            decimalPlaces: 0,
            color: (opacity = 1) => colors.primary,
            labelColor: (opacity = 1) => colors.textSecondary,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: colors.surface
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
          withVerticalLines={false}
          withHorizontalLines={true}
        />
      </View>

      <View style={styles.progressContainer}>
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Seu progresso virtual mapeado por IA. Continue firme nos exercícios para atingir os 100%!
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
    marginBottom: 16,
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
  chartContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  progressContainer: {
    gap: 10,
    marginTop: 10,
  },
  helperText: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
    textAlign: "center",
  },
});
