import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Card } from "@/components";
import { useClinicalAlerts } from "@/hooks/useClinicalAlerts";
import { useColors } from "@/hooks/useColorScheme";
import { ShieldAlert, ChevronRight, Activity, Bell } from "lucide-react-native";
import { router } from "expo-router";

export const ProactiveRiskDashboard: React.FC = () => {
  const colors = useColors();
  const { alerts, isLoading, highSeverityCount } = useClinicalAlerts();

  if (isLoading && alerts.length === 0) {
    return null; // Silent load
  }

  if (alerts.length === 0) {
    return (
      <Card style={styles.emptyContainer}>
        <View style={styles.header}>
          <Bell size={16} color={colors.textSecondary} />
          <Text style={[styles.title, { color: colors.text }]}>Alertas Clínicos</Text>
        </View>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Tudo em ordem. Nenhum desvio detectado hoje.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <ShieldAlert size={20} color={highSeverityCount > 0 ? "#ef4444" : "#fbbf24"} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Atenção Proativa</Text>
        </View>
        {highSeverityCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{highSeverityCount} CRÍTICO</Text>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {alerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            onPress={() => router.push(`/patient/${alert.patient_id}`)}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.alertCard,
                { borderColor: alert.severity === "high" ? "#ef444440" : colors.border },
              ]}
            >
              <View style={styles.alertHeader}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: alert.severity === "high" ? "#ef4444" : "#fbbf24" },
                  ]}
                />
                <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                  {alert.patient_name || "Paciente"}
                </Text>
              </View>

              <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
                {alert.message}
              </Text>

              <View style={styles.footer}>
                <View style={styles.typeTag}>
                  <Activity size={10} color={colors.primary} />
                  <Text style={[styles.typeText, { color: colors.primary }]}>
                    {alert.type === "pain_spike" ? "Pico de Dor" : "Queda de Adesão"}
                  </Text>
                </View>
                <ChevronRight size={14} color={colors.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  badge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
  },
  scrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  alertCard: {
    width: 220,
    padding: 12,
    borderWidth: 1.5,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  patientName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  message: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(30, 64, 175, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 11,
    textAlign: "center",
  },
});
