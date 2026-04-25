import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { gamificationApi } from "@/lib/api";
import { Achievement, ShopItem, Quest, GamificationProfile } from "@/types/api";
import { Card } from "@/components";
import { router } from "expo-router";
import Animated, { FadeIn, ZoomIn, FadeOut } from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function GamificationScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<"quests" | "achievements" | "shop">("quests");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [p, q, a, s] = await Promise.all([
        gamificationApi.getProfile(),
        gamificationApi.getQuests(),
        gamificationApi.getAchievements(),
        gamificationApi.getShop(),
      ]);
      setProfile(p);
      setQuests(q);
      setAchievements(a);
      setShopItems(s);
    } catch (error) {
      console.error("[Gamification] Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleClaimXp = async (questId: string, amount: number) => {
    try {
      setLoading(true);
      await gamificationApi.awardXp({
        patientId: profile?.patientId || "",
        amount,
        reason: "QUEST_COMPLETED",
        description: `Missão concluída: ${quests.find((q) => q.id === questId)?.title}`,
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchData();
    } catch (error) {
      console.error("[Gamification] Error claiming XP:", error);
      Alert.alert("Erro", "Não foi possível resgatar seu XP.");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyItem = async (item: ShopItem) => {
    if ((profile?.xp || 0) < item.cost) {
      Alert.alert(
        "Saldo Insuficiente",
        `Você precisa de mais ${item.cost - (profile?.xp || 0)} FF para trocar por este item.`,
      );
      return;
    }

    Alert.alert("Confirmar Troca", `Deseja trocar ${item.cost} FF por "${item.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Trocar",
        onPress: async () => {
          try {
            setLoading(true);
            await gamificationApi.buyItem(item.id);
            Alert.alert("Parabéns!", `Você adquiriu "${item.name}"!`);
            fetchData();
          } catch (error) {
            console.error("[Gamification] Error buying item:", error);
            Alert.alert("Erro", "Ocorreu um problema na troca.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gamificação</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Progress */}
        <Card style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.levelText}>Nv. {profile?.level || 1}</Text>
            </View>
            <View style={styles.xpInfo}>
              <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>XP Total</Text>
              <Text style={[styles.xpValue, { color: colors.text }]}>{profile?.xp || 0} XP</Text>
            </View>
            <View style={styles.streakInfo}>
              <Ionicons name="flame" size={24} color="#FF9500" />
              <Text style={[styles.streakValue, { color: colors.text }]}>
                {profile?.streak || 0}
              </Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.min(100, ((profile?.xp || 0) % 1000) / 10)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {1000 - ((profile?.xp || 0) % 1000)} XP para o próximo nível
            </Text>
          </View>
        </Card>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(["quests", "achievements", "shop"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabItem,
                activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab === "quests" ? "Missões" : tab === "achievements" ? "Conquistas" : "Loja"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {activeTab === "quests" && (
            <View>
              {quests.length > 0 ? (
                quests.map((quest) => (
                  <Card key={quest.id} style={styles.itemCard}>
                    <View style={styles.questHeader}>
                      <View style={styles.questText}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>
                          {quest.title}
                        </Text>
                        <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
                          {quest.description}
                        </Text>
                      </View>
                      <View style={styles.rewardBadge}>
                        <Text style={styles.rewardText}>+{quest.xpReward} XP</Text>
                      </View>
                    </View>
                    {quest.status === "completed" && (
                      <TouchableOpacity
                        style={[styles.claimButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleClaimXp(quest.id, quest.xpReward)}
                      >
                        <Text style={styles.claimButtonText}>Resgatar XP</Text>
                      </TouchableOpacity>
                    )}
                    {quest.status === "claimed" && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                        <Text style={[styles.completedText, { color: "#10b981" }]}>Concluída</Text>
                      </View>
                    )}
                  </Card>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Nenhuma missão disponível no momento.
                </Text>
              )}
            </View>
          )}

          {activeTab === "achievements" && (
            <View style={styles.achievementsGrid}>
              {achievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View
                    style={[
                      styles.achievementIconContainer,
                      {
                        backgroundColor: achievement.unlockedAt
                          ? colors.primary + "20"
                          : colors.surfaceHover,
                        borderColor: achievement.unlockedAt ? colors.primary : "transparent",
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Ionicons
                      name={(achievement.icon as any) || "ribbon"}
                      size={32}
                      color={achievement.unlockedAt ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <Text
                    style={[
                      styles.achievementTitle,
                      { color: achievement.unlockedAt ? colors.text : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {achievement.title}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === "shop" && (
            <View style={styles.shopGrid}>
              {shopItems.map((item) => (
                <Card key={item.id} style={styles.shopCard}>
                  <View
                    style={[styles.shopIconContainer, { backgroundColor: colors.surfaceHover }]}
                  >
                    <Ionicons
                      name={(item.icon as any) || "gift"}
                      size={40}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.costContainer}>
                    <Ionicons name="flash" size={16} color="#f59e0b" />
                    <Text style={[styles.costText, { color: "#f59e0b" }]}>{item.cost} FF</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.buyButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleBuyItem(item)}
                  >
                    <Text style={styles.buyButtonText}>Trocar</Text>
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {showSuccess && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[
            StyleSheet.absoluteFill,
            styles.successOverlay,
            { backgroundColor: "rgba(0,0,0,0.7)" },
          ]}
        >
          <Animated.View entering={ZoomIn} style={styles.successContent}>
            <Ionicons name="sparkles" size={80} color="#FFD700" />
            <Text style={styles.successTitle}>XP Resgatado!</Text>
            <Text style={styles.successSub}>Continue evoluindo no seu tratamento.</Text>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  profileCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  xpInfo: {
    alignItems: "center",
  },
  xpLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  streakInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabContent: {
    padding: 16,
  },
  itemCard: {
    marginBottom: 12,
    padding: 16,
  },
  questHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  questText: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  rewardBadge: {
    backgroundColor: "#3b82f620",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardText: {
    color: "#3b82f6",
    fontSize: 12,
    fontWeight: "bold",
  },
  claimButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  claimButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  completedText: {
    fontSize: 14,
    fontWeight: "600",
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  achievementItem: {
    width: (width - 32 - 16) / 2,
    alignItems: "center",
    marginBottom: 16,
  },
  achievementIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  shopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  shopCard: {
    width: (width - 32 - 16) / 2,
    padding: 12,
    alignItems: "center",
  },
  shopIconContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  costContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    marginBottom: 12,
  },
  costText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  buyButton: {
    width: "100%",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  buyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  successOverlay: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  successContent: {
    backgroundColor: "#fff",
    padding: 32,
    borderRadius: 32,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1e293b",
    marginTop: 16,
  },
  successSub: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
  },
});
