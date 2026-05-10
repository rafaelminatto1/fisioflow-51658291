import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAngleStatus, formatAngle } from "../../../utils/pose-utils";

interface AnalysisResultCardProps {
  joint: string;
  angle: number;
  reference: number;
  tolerance: number;
}

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({
  joint,
  angle,
  reference,
  tolerance,
}) => {
  const status = getAngleStatus(angle, reference, tolerance);
  
  const getStatusColor = () => {
    switch (status) {
      case "ok": return "#22c55e";
      case "warning": return "#eab308";
      case "alert": return "#ef4444";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "ok": return "checkmark-circle";
      case "warning": return "alert-circle";
      case "alert": return "close-circle";
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.jointLabel}>{joint}</Text>
        <Ionicons name={getStatusIcon()} size={20} color={getStatusColor()} />
      </View>
      
      <View style={styles.metrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{formatAngle(angle)}</Text>
          <Text style={styles.metricLabel}>Atual</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: "#64748b" }]}>{formatAngle(reference)}</Text>
          <Text style={styles.metricLabel}>Ref.</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: getStatusColor() }]}>
            {formatAngle(Math.abs(angle - reference))}
          </Text>
          <Text style={styles.metricLabel}>Desvio</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  jointLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  metricLabel: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
    textTransform: "uppercase",
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "#f1f5f9",
  },
});
