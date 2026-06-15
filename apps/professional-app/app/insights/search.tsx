import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClinicalInsightsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [minPain, setMinPain] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["clinical-insights", query, minPain],
    queryFn: async () => {
      if (query.length < 3) return null;
      const params = new URLSearchParams();
      params.append("q", query);
      if (minPain !== null) params.append("minPain", minPain.toString());

      const res = await fetchApi<any>(`/api/ai/insights?${params.toString()}`);
      return res.data;
    },
    enabled: query.length >= 3,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Insights Clínicos IA</Text>
        </View>

        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Ionicons name="sparkles" size={20} color={colors.primary} style={styles.searchIcon} />
            <TextInput
              placeholder="Ex: pacientes com dor lombar e perda de força..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Dor mínima:</Text>
            {[0, 3, 5, 7, 9].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => setMinPain(minPain === val ? null : val)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: minPain === val ? colors.primary : colors.background,
                    borderColor: minPain === val ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: minPain === val ? "#fff" : colors.textSecondary },
                  ]}
                >
                  {val === 0 ? "Todas" : `> ${val}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.resultsScroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Analisando base clínica...
            </Text>
          </View>
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((match: any) => (
            <TouchableOpacity
              key={match.evolutionId}
              style={[
                styles.matchCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() =>
                router.push(
                  `/evolution-detail?evolutionId=${match.evolutionId}&patientId=${match.patientId}&patientName=${encodeURIComponent(match.patientName)}` as any,
                )
              }
            >
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {match.patientName.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.patientName, { color: colors.text }]}>
                    {match.patientName}
                  </Text>
                  <Text style={[styles.date, { color: colors.textSecondary }]}>
                    {format(new Date(match.sessionDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.painBadge,
                    { backgroundColor: match.painScale > 7 ? "#EF444420" : colors.primary + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.painText,
                      { color: match.painScale > 7 ? "#EF4444" : colors.primary },
                    ]}
                  >
                    Dor {match.painScale}/10
                  </Text>
                </View>
              </View>

              <Text style={[styles.summary, { color: colors.text }]} numberOfLines={3}>
                {match.summary}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.similarity, { color: colors.success }]}>
                  {Math.round(match.similarity * 100)}% de relevância
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        ) : query.length >= 3 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum padrão clínico correspondente encontrado.
            </Text>
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="bulb-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Busque por sintomas, tratamentos ou diagnósticos para encontrar casos similares.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { marginRight: 12 },
  title: { fontSize: 20, fontWeight: "bold" },
  searchSection: { paddingHorizontal: 16, paddingBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 50,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  filters: { marginTop: 12, flexDirection: "row" },
  filterLabel: { alignSelf: "center", marginRight: 8, fontSize: 12, fontWeight: "600" },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontSize: 12, fontWeight: "600" },
  resultsScroll: { padding: 16 },
  centerContainer: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  matchCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontWeight: "bold", fontSize: 16 },
  patientName: { fontSize: 16, fontWeight: "bold" },
  date: { fontSize: 12 },
  painBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  painText: { fontSize: 12, fontWeight: "bold" },
  summary: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
  },
  similarity: { fontSize: 12, fontWeight: "600" },
});
