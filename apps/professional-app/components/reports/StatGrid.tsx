import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColorScheme";

interface Stat {
  label: string;
  value: string | number;
  color: string;
}

interface StatGridProps {
  stats: Stat[];
}

export function StatGrid({ stats }: StatGridProps) {
  const colors = useColors();

  return (
    <View style={styles.grid}>
      {stats.map((stat, index) => (
        <View
          key={index}
          style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
