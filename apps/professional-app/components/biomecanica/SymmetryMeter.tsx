import React from "react";
import { View, Text, StyleSheet, DimensionValue } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { bio, font } from "@/constants/biomecanica";

interface SymmetryMeterProps {
  score: number; // 0 to 100
  leftLabel?: string;
  rightLabel?: string;
}

export function SymmetryMeter({ score, leftLabel = "E", rightLabel = "D" }: SymmetryMeterProps) {
  const pointerPos: DimensionValue = `${score}%`;
  
  // Determinamos o tom base no desvio da simetria (50% é o centro perfeito)
  const deviation = Math.abs(50 - score);
  const statusColor = deviation < 5 ? "#10B981" : deviation < 15 ? "#F59E0B" : "#EF4444";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simetria L/R</Text>
        <Text style={[styles.score, { color: statusColor }]}>
          {deviation < 5 ? "Excelente" : deviation < 15 ? "Moderado" : "Desvio Crítico"}
        </Text>
      </View>

      <View style={styles.trackContainer}>
        <Text style={styles.sideLabel}>{leftLabel}</Text>
        <View style={styles.track}>
          {/* Gradient-like sections */}
          <View style={[styles.section, { backgroundColor: "#EF444430", flex: 3 }]} />
          <View style={[styles.section, { backgroundColor: "#F59E0B30", flex: 1.5 }]} />
          <View style={[styles.section, { backgroundColor: "#10B98140", flex: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#10B981" }]} />
          <View style={[styles.section, { backgroundColor: "#F59E0B30", flex: 1.5 }]} />
          <View style={[styles.section, { backgroundColor: "#EF444430", flex: 3 }]} />
          
          {/* Pointer */}
          <View style={[styles.pointer, { left: pointerPos, backgroundColor: statusColor }]} />
        </View>
        <Text style={styles.sideLabel}>{rightLabel}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Balanço de amplitude e força baseado na trajetória</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: bio.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: bio.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontFamily: font.bold,
    color: bio.fg,
  },
  score: {
    fontSize: 12,
    fontFamily: font.extrabold,
  },
  trackContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sideLabel: {
    fontSize: 12,
    fontFamily: font.extrabold,
    color: bio.muted,
    width: 15,
    textAlign: "center",
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    flexDirection: "row",
    overflow: "visible",
    position: "relative",
  },
  section: {
    height: "100%",
  },
  pointer: {
    position: "absolute",
    top: -4,
    width: 4,
    height: 16,
    borderRadius: 2,
    marginLeft: -2,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
  footerText: {
    fontSize: 10,
    fontFamily: font.semibold,
    color: bio.muted,
    textAlign: "center",
  },
});
