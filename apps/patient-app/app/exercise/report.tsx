import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Card, Button } from "@/components";
import { api } from "@/lib/api";

export default function ExerciseReportScreen() {
  const {
    id: exerciseId,
    reps,
    rom,
  } = useLocalSearchParams<{ id: string; reps: string; rom: string }>();
  const router = useRouter();
  const colors = useColors();
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      await api.post("/api/clinical/home-exercises/share", {
        exerciseId,
        metrics: {
          reps: Number(reps),
          rom: Number(rom),
          compensations: ["leve inclinação lateral"],
          feedback: "Senti um pouco de cansaço no final.",
        },
      });

      Alert.alert("Sucesso", "Seu progresso foi compartilhado com seu fisioterapeuta! 🚀");
      router.dismissAll();
      router.push("/(tabs)");
    } catch {
      Alert.alert("Erro", "Não foi possível compartilhar os dados agora.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Resultado da Série</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Metric Summary */}
        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>REPETIÇÕES</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>{reps}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>AMPLITUDE</Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>{rom}°</Text>
          </Card>
        </View>

        {/* AI Insight */}
        <Card style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.insightTitle, { color: colors.text }]}>Análise da IA</Text>
          </View>
          <Text style={[styles.insightText, { color: colors.text }]}>
            Excelente controle motor nas primeiras 8 repetições. Detectamos uma leve inclinação do
            tronco para a esquerda nas últimas 2 repetições, possivelmente devido à fadiga.
          </Text>
          <View style={styles.tipContainer}>
            <Ionicons name="bulb-outline" size={16} color={colors.warning} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Dica: Tente focar na contração do abdômen ao descer.
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Compartilhar com Fisioterapeuta"
            onPress={handleShare}
            loading={sharing}
            icon={
              <Ionicons name="share-social" size={20} color="#fff" style={{ marginRight: 8 }} />
            }
          />
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.retryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.retryText, { color: colors.textSecondary }]}>Refazer Série</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  content: { padding: 20, gap: 20 },
  metricsRow: { flexDirection: "row", gap: 15 },
  metricCard: { flex: 1, alignItems: "center", padding: 20 },
  metricLabel: { fontSize: 10, fontWeight: "800", marginBottom: 5 },
  metricValue: { fontSize: 32, fontWeight: "bold" },
  insightCard: { padding: 20 },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  insightTitle: { fontSize: 18, fontWeight: "bold" },
  insightText: { fontSize: 15, lineHeight: 22, marginBottom: 15 },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 10,
    borderRadius: 8,
  },
  tipText: { flex: 1, fontSize: 13 },
  actions: { marginTop: 20, gap: 12 },
  retryButton: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  retryText: { fontWeight: "600" },
});
