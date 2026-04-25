import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "./ui/Skeleton";
import { useColors } from "@/hooks/useColorScheme";

export function SkeletonExercise() {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Skeleton height={120} width="100%" style={styles.image} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Skeleton width="60%" height={20} variant="text" />
          <Skeleton width="20%" height={24} variant="rectangular" style={styles.badge} />
        </View>
        <Skeleton width="90%" height={16} variant="text" style={styles.line} />
        <Skeleton width="70%" height={16} variant="text" style={styles.line} />
        <View style={styles.footer}>
          <Skeleton width={80} height={28} variant="rectangular" style={styles.tag} />
          <Skeleton width={80} height={28} variant="rectangular" style={styles.tag} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
  },
  image: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    borderRadius: 12,
  },
  line: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  tag: {
    borderRadius: 8,
  },
});
