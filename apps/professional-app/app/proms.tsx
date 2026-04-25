import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { usePROMs, PROM_SCALES, getScaleInfo } from "@/hooks/usePROMs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PROMs() {
  const { patientId, patientName } = useLocalSearchParams<{
    patientId: string;
    patientName: string;
  }>();
  const colors = useColors();
  const { medium } = useHaptics();
  const [search, setSearch] = useState("");

  const { data: results = [], isLoading } = usePROMs(patientId);

  const filteredScales = PROM_SCALES.filter(
    (s) =>
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.shortName.toLowerCase().includes(search.toLowerCase()),
  );

  const lastResultForScale = (scaleId: string) => results.find((r) => r.scale_name === scaleId);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Escalas Clínicas",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar escala..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {results.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  HISTÓRICO RECENTE
                </Text>
                {results.slice(0, 3).map((r) => {
                  const scale = getScaleInfo(r.scale_name);
                  return (
                    <View
                      key={r.id}
                      style={[
                        styles.historyCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.historyCardLeft}>
                        <Text style={[styles.historyScaleName, { color: colors.text }]}>
                          {scale?.shortName ?? r.scale_name}
                        </Text>
                        <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                          {format(new Date(r.applied_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </Text>
                        {r.interpretation && (
                          <Text
                            style={[styles.historyInterpretation, { color: colors.textSecondary }]}
                          >
                            {r.interpretation}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.scoreBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.scoreText, { color: colors.primary }]}>
                          {r.score}
                          {scale?.unit ? ` ${scale.unit}` : ""}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                ESCALAS DISPONÍVEIS
              </Text>
              {filteredScales.map((scale) => {
                const last = lastResultForScale(scale.id);
                return (
                  <TouchableOpacity
                    key={scale.id}
                    style={[
                      styles.scaleCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      medium();
                      router.push({
                        pathname: "/prom-form",
                        params: { patientId, patientName, scaleId: scale.id },
                      });
                    }}
                  >
                    <View style={styles.scaleCardContent}>
                      <View style={[styles.scaleIcon, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.scaleInfo}>
                        <Text style={[styles.scaleName, { color: colors.text }]}>
                          {scale.shortName}
                        </Text>
                        <Text
                          style={[styles.scaleFullName, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {scale.name}
                        </Text>
                        {last && (
                          <Text style={[styles.scaleLastResult, { color: colors.textMuted }]}>
                            Último: {last.score} {scale.unit} —{" "}
                            {format(new Date(last.applied_at), "dd/MM/yyyy")}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 15 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  historyCardLeft: { flex: 1 },
  historyScaleName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  historyDate: { fontSize: 12, marginBottom: 2 },
  historyInterpretation: { fontSize: 12 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  scoreText: { fontSize: 14, fontWeight: "700" },
  scaleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  scaleCardContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  scaleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleInfo: { flex: 1 },
  scaleName: { fontSize: 15, fontWeight: "700" },
  scaleFullName: { fontSize: 12, marginTop: 1 },
  scaleLastResult: { fontSize: 11, marginTop: 4 },
});
