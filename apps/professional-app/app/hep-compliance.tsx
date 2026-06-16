import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useHEPCompliance, usePatientExercisePlans } from "@/hooks/useHEPCompliance";
import { useSyncStore } from "@/store/sync-store";
import type { ThemeColors } from "@/types/theme";

function ComplianceBar({ rate, colors }: { rate: number; colors: ThemeColors }) {
  const color = rate >= 70 ? colors.success : rate >= 40 ? "#F59E0B" : colors.error;
  return (
    <View style={styles.barContainer}>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.min(rate, 100)}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.barLabel, { color }]}>{Math.round(rate)}%</Text>
    </View>
  );
}

function CalendarDots({
  days,
  colors,
}: {
  days: Array<{ date: string; completed: boolean }>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.calendarRow}>
      {days.map((d) => (
        <View
          key={d.date}
          style={[styles.dot, { backgroundColor: d.completed ? colors.success : colors.border }]}
        />
      ))}
    </View>
  );
}

export default function HEPComplianceScreen() {
  const {
    patientId,
    patientName,
    planId: initialPlanId,
  } = useLocalSearchParams<{
    patientId: string;
    patientName: string;
    planId?: string;
  }>();
  const colors = useColors();
  const { light, success } = useHaptics();

  const addMutation = useSyncStore((state) => state.addMutation);

  const { data: plans = [], isLoading: isLoadingPlans } = usePatientExercisePlans(patientId);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(
    initialPlanId || undefined,
  );

  const { data: compliance, isLoading: isLoadingCompliance } = useHEPCompliance(
    selectedPlanId ?? (plans[0]?.id as string | undefined),
  );

  const activePlanId = selectedPlanId ?? plans[0]?.id;

  const handleGeneratePDF = (planId: string) => {
    light();
    addMutation({
      endpoint: `/api/exercise-plans/${planId}/pdf`,
      method: "POST",
      data: {},
    });
    success();
    Alert.alert("Sucesso", "A geração do PDF foi solicitada. O arquivo será enviado em breve.");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Adesão ao HEP",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {patientName && (
          <Text style={[styles.patientName, { color: colors.textSecondary }]}>{patientName}</Text>
        )}

        {/* Plan selector */}
        {isLoadingPlans ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 16 }} />
        ) : plans.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planSelector}>
            {plans.map((p) => {
              const active = (selectedPlanId ?? plans[0]?.id) === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.planChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    light();
                    setSelectedPlanId(p.id);
                  }}
                >
                  <Text style={[styles.planChipText, { color: active ? "#fff" : colors.text }]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* No plans */}
        {!isLoadingPlans && plans.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhum plano de exercícios
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Crie um plano de exercícios para acompanhar a adesão.
            </Text>
          </View>
        )}

        {/* Compliance data */}
        {isLoadingCompliance && activePlanId && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
        )}

        {compliance && !isLoadingCompliance && (
          <>
            {/* Overall rate */}
            <View
              style={[
                styles.overallCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>{compliance.planName}</Text>
                <TouchableOpacity onPress={() => handleGeneratePDF(activePlanId!)} style={styles.pdfButton}>
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                  <Text style={styles.pdfButtonText}>Gerar PDF</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.overallLabel, { color: colors.textSecondary }]}>
                Adesão geral
              </Text>
              <ComplianceBar rate={compliance.rate} colors={colors} />
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {compliance.completedDays}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Dias feitos
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {compliance.totalDays}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Total de dias
                  </Text>
                </View>
              </View>
            </View>

            {/* Last 14 days calendar */}
            <View
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>Últimos 14 dias</Text>
              <CalendarDots days={compliance.last14Days} colors={colors} />
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Realizado</Text>
                <View
                  style={[styles.legendDot, { backgroundColor: colors.border, marginLeft: 12 }]}
                />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  Não realizado
                </Text>
              </View>
            </View>

            {/* By exercise */}
            {Object.keys(compliance.byExercise).length > 0 && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>Por exercício</Text>
                {Object.entries(compliance.byExercise).map(([name, data]) => (
                  <View key={name} style={styles.exerciseRow}>
                    <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <View style={styles.exerciseBarWrap}>
                      <ComplianceBar rate={data.rate} colors={colors} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  patientName: { fontSize: 13, marginBottom: 12, fontStyle: "italic" },
  planSelector: { flexGrow: 0, marginBottom: 16 },
  planChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  planChipText: { fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyDesc: { fontSize: 14, textAlign: "center" },
  overallCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  pdfButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  overallLabel: { fontSize: 14, marginBottom: 8 },
  barContainer: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  barLabel: { fontSize: 14, fontWeight: "700", minWidth: 40, textAlign: "right" },
  statsRow: { flexDirection: "row", marginTop: 12, gap: 24 },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  calendarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  dot: { width: 18, height: 18, borderRadius: 9 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  exerciseRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  exerciseName: { flex: 1, fontSize: 13, fontWeight: "500" },
  exerciseBarWrap: { flex: 1.5 },
});
