import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Card } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WearableReading {
  id: string;
  source: string;
  data_type: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata?: any;
}

interface WearablesSummaryWidgetProps {
  patientId: string;
}

export const WearablesSummaryWidget: React.FC<WearablesSummaryWidgetProps> = ({ patientId }) => {
  const colors = useColors();

  const { data, isLoading } = useQuery({
    queryKey: ["patient-wearables-summary", patientId],
    queryFn: () => fetchApi<{ readings: WearableReading[], integrations: any[] }>(
      `/api/wearables/patient/${patientId}/summary`
    ),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </Card>
    );
  }

  const readings = data?.data?.readings || [];
  if (readings.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "steps": return "footsteps";
      case "heart_rate": return "heart";
      case "sleep_hours": return "moon";
      case "distance": return "walk";
      case "active_calories": return "flame";
      default: return "fitness";
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "steps": return "Passos";
      case "heart_rate": return "Freq. Cardíaca";
      case "sleep_hours": return "Sono";
      case "distance": return "Distância";
      case "active_calories": return "Calorias";
      default: return type;
    }
  };

  const formatValue = (item: WearableReading) => {
    if (item.data_type === "distance") return `${(item.value / 1000).toFixed(1)} km`;
    if (item.data_type === "sleep_hours") return `${item.value}h`;
    if (item.data_type === "steps") return item.value.toLocaleString();
    return `${item.value} ${item.unit || ""}`;
  };

  return (
    <Card style={[styles.container, { backgroundColor: colors.surface + "80" }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>Monitoramento Remoto (Wearables)</Text>
        <Ionicons name="pulse" size={16} color={colors.primary} />
      </View>

      <View style={styles.grid}>
        {readings.map((item) => (
          <View key={item.id} style={styles.metric}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + "10" }]}>
              <Ionicons name={getIcon(item.data_type) as any} size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{getLabel(item.data_type)}</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{formatValue(item)}</Text>
              <Text style={[styles.metricTime, { color: colors.textMuted }]}>
                {format(new Date(item.timestamp), "HH:mm", { locale: ptBR })}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: "45%",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: -2,
  },
  metricTime: {
    fontSize: 8,
    marginTop: 2,
  }
});
