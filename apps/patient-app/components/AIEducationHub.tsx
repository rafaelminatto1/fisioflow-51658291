import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Card } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth";

export const AIEducationHub = () => {
  const colors = useColors();
  const { user } = useAuthStore();

  const { data: tipsResponse, isLoading } = useQuery({
    queryKey: ["patient-education-tips", user?.id],
    queryFn: () =>
      api.request<{ data: string[] }>(`/api/ai-search/education?patientId=${user?.id}`),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60 * 24, // 24h
  });

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </Card>
    );
  }

  const tips = tipsResponse?.data || [];
  if (tips.length === 0) return null;

  return (
    <Card
      style={[
        styles.container,
        { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE", borderWidth: 1 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="bulb" size={20} color="#4F46E5" />
        </View>
        <Text style={[styles.title, { color: "#1E1B4B" }]}>Dicas de Saúde Personalizadas</Text>
      </View>

      <View style={styles.list}>
        {tips.map((tip: string, i: number) => (
          <View key={i} style={styles.item}>
            <Ionicons name="checkmark-circle" size={16} color="#4F46E5" style={styles.itemIcon} />
            <Text style={[styles.itemText, { color: "#312E81" }]}>{tip}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footerText}>
        * Baseado em protocolos clínicos da Mooca Fisio e sua condição atual.
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    marginBottom: 20,
    borderRadius: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  list: {
    gap: 14,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemIcon: {
    marginTop: 2,
  },
  itemText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    flex: 1,
  },
  footerText: {
    fontSize: 9,
    color: "#6366F1",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 20,
    textAlign: "center",
    opacity: 0.6,
  },
});
