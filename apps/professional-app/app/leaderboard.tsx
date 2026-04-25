import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { getLeaderboard, ApiLeaderboardEntry } from "@/lib/api";
import { Card } from "@/components";
import { router } from "expo-router";

export default function LeaderboardScreen() {
  const colors = useColors();
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<ApiLeaderboardEntry[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const data = await getLeaderboard({ period });
      setEntries(data);
    } catch (error) {
      console.error("[Leaderboard] Error fetching:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return { name: "trophy", color: "#FFD700" }; // Gold
    if (index === 1) return { name: "trophy", color: "#C0C0C0" }; // Silver
    if (index === 2) return { name: "trophy", color: "#CD7F32" }; // Bronze
    return null;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ranking da Clínica</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        {(["weekly", "monthly", "all"] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodTab, period === p && { backgroundColor: colors.primary }]}
            onPress={() => {
              setLoading(true);
              setPeriod(p);
            }}
          >
            <Text
              style={[
                styles.periodTabText,
                { color: period === p ? "#FFF" : colors.textSecondary },
              ]}
            >
              {p === "weekly" ? "Semanal" : p === "monthly" ? "Mensal" : "Geral"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {entries.length > 0 ? (
            entries.map((entry, index) => {
              const icon = getRankIcon(index);
              return (
                <Card key={entry.id || entry.patient_id} style={styles.rankCard}>
                  <View style={styles.rankIndexContainer}>
                    {icon ? (
                      <Ionicons name={icon.name as any} size={24} color={icon.color} />
                    ) : (
                      <Text style={[styles.rankIndex, { color: colors.textMuted }]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  <View style={styles.patientInfo}>
                    <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                      {entry.full_name}
                    </Text>
                    <Text style={[styles.levelText, { color: colors.textSecondary }]}>
                      Nível {entry.level}
                    </Text>
                  </View>

                  <View style={styles.statsContainer}>
                    <View style={styles.pointsContainer}>
                      <Text style={[styles.pointsValue, { color: colors.primary }]}>
                        {entry.total_points}
                      </Text>
                      <Text style={[styles.pointsLabel, { color: colors.textMuted }]}>pts</Text>
                    </View>
                    {entry.current_streak > 0 && (
                      <View style={styles.streakBadge}>
                        <Ionicons name="flame" size={12} color="#FF9500" />
                        <Text style={styles.streakText}>{entry.current_streak}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="stats-chart-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum dado disponível para este período.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerRight: {
    width: 32,
  },
  periodContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
  },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
  },
  rankIndexContainer: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rankIndex: {
    fontSize: 18,
    fontWeight: "bold",
  },
  patientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  levelText: {
    fontSize: 13,
  },
  statsContainer: {
    alignItems: "flex-end",
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  pointsLabel: {
    fontSize: 12,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF950020",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    gap: 2,
  },
  streakText: {
    color: "#FF9500",
    fontSize: 11,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
});
