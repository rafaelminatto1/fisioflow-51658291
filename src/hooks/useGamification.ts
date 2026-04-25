/**
 * useGamification — Cloudflare Workers + Neon PostgreSQL
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { triggerGamificationFeedback } from "@/lib/gamification/feedback-utils";
import { fisioLogger as logger } from "@/lib/errors/logger";
import {
  gamificationApi,
  type GamificationProfileRow,
  type ShopItemRow,
  type UserInventoryRow,
} from "@/api/v2";
import type {
  DailyQuestItem,
  GamificationProfile,
  Achievement,
  UnlockedAchievement,
  AwardXpParams,
  AwardXpResult,
  ShopItem,
  UserInventoryItem,
  BuyItemParams,
} from "@/types/gamification";

// ─── Level helpers ────────────────────────────────────────────────────────────

const LEVEL_BASE_XP = 1000;
const LEVEL_MULTIPLIER = 1.2;

const calculateLevel = (totalXp: number) => {
  let level = 1;
  let xpForNextLevel = LEVEL_BASE_XP;
  let accumulated = 0;
  while (totalXp >= accumulated + xpForNextLevel) {
    accumulated += xpForNextLevel;
    level++;
    xpForNextLevel = Math.floor(xpForNextLevel * LEVEL_MULTIPLIER);
  }
  return {
    level,
    xpForNextLevel,
    currentLevelXp: totalXp - accumulated,
    progress: xpForNextLevel > 0 ? ((totalXp - accumulated) / xpForNextLevel) * 100 : 100,
  };
};

// ─── Row → domain type mappers ────────────────────────────────────────────────

const rowToProfile = (row: GamificationProfileRow): GamificationProfile => ({
  id: row.id,
  patient_id: row.patient_id,
  current_xp: row.current_xp,
  level: row.level,
  current_streak: row.current_streak,
  longest_streak: row.longest_streak,
  total_points: row.total_points,
  last_activity_date: row.last_activity_date,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const rowToShopItem = (row: ShopItemRow): ShopItem => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  cost: row.cost,
  type: row.type as ShopItem["type"],
  icon: row.icon,
  metadata: row.metadata,
  is_active: row.is_active,
});

const rowToInventoryItem = (row: UserInventoryRow): UserInventoryItem => ({
  id: row.id,
  user_id: row.user_id,
  item_id: row.item_id,
  quantity: row.quantity,
  is_equipped: row.is_equipped,
  item: row.item_name
    ? {
        id: row.item_id,
        code: row.item_code,
        name: row.item_name,
        description: row.item_description ?? "",
        cost: row.item_cost ?? 0,
        type: (row.item_type ?? "consumable") as ShopItem["type"],
        icon: row.item_icon,
        metadata: {},
        is_active: true,
      }
    : undefined,
});

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseGamificationResult {
  profile: GamificationProfile | null;
  isProfileNotFound: boolean;
  dailyQuests: DailyQuestItem[];
  allAchievements: Achievement[];
  unlockedAchievements: UnlockedAchievement[];
  lockedAchievements: Achievement[];
  isLoading: boolean;
  awardXp: ReturnType<typeof useMutation<AwardXpResult, Error, AwardXpParams>>;
  completeQuest: ReturnType<typeof useMutation<void, Error, { questId: string }>>;
  freezeStreak: ReturnType<typeof useMutation<void, Error, void>>;
  freezeCost: { price: number; max_per_month: number };
  shopItems: ShopItem[];
  userInventory: UserInventoryItem[];
  buyItem: ReturnType<typeof useMutation<void, Error, BuyItemParams>>;
  xpPerLevel: number;
  currentLevel: number;
  currentXp: number;
  totalPoints: number;
  progressToNextLevel: number;
  progressPercentage: number;
  xpProgress: number;
  totalSessions: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    reason: string;
    created_at: string;
  }>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useGamification = (patientId: string): UseGamificationResult => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const enabled = patientId.trim().length > 0;

  // ── 1. Shop items (global, sem patientId) ──────────────────────────────────
  const { data: shopItemsRaw = [] } = useQuery({
    queryKey: ["shop-items"],
    queryFn: async () => {
      try {
        const res = await gamificationApi.getShopItems();
        return res.data ?? [];
      } catch (err) {
        logger.warn("[useGamification] Falha ao carregar loja", { err }, "useGamification");
        return [];
      }
    },
    enabled,
    staleTime: 1000 * 60 * 30,
  });

  const shopItems = shopItemsRaw.map(rowToShopItem);

  // ── 2. Inventário do paciente ──────────────────────────────────────────────
  const { data: inventoryRaw = [] } = useQuery({
    queryKey: ["user-inventory", patientId],
    queryFn: async () => {
      try {
        const res = await gamificationApi.getInventory(patientId);
        return res.data ?? [];
      } catch (err) {
        logger.warn("[useGamification] Falha ao carregar inventário", { err }, "useGamification");
        return [];
      }
    },
    enabled,
  });

  const userInventory = inventoryRaw.map(rowToInventoryItem);

  // ── 3. Perfil de gamificação ───────────────────────────────────────────────
  const {
    data: profileRaw,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ["gamification-profile", patientId],
    queryFn: async () => {
      try {
        const res = await gamificationApi.getProfile(patientId);
        return res.data ?? null;
      } catch (err) {
        logger.warn("[useGamification] Falha ao carregar perfil", { err }, "useGamification");
        return null;
      }
    },
    enabled,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const profile = profileRaw ? rowToProfile(profileRaw) : null;
  const isProfileNotFound = !profile && !isLoadingProfile && profileError;

  // ── 4. Missões diárias ────────────────────────────────────────────────────
  const { data: questsRecord } = useQuery({
    queryKey: ["daily-quests", patientId],
    queryFn: async () => {
      try {
        const res = await gamificationApi.getQuests(patientId);
        return res.data ?? null;
      } catch (err) {
        logger.warn("[useGamification] Falha ao carregar missões", { err }, "useGamification");
        return null;
      }
    },
    enabled,
    staleTime: 1000 * 60 * 60,
  });

  const dailyQuests: DailyQuestItem[] = (questsRecord?.quests_data as DailyQuestItem[]) ?? [];

  // ── 5. Conquistas ─────────────────────────────────────────────────────────
  const { data: achievementsData } = useQuery({
    queryKey: ["achievements", patientId],
    queryFn: async () => {
      try {
        const res = await gamificationApi.getAchievements(patientId);
        return res.data ?? { all: [], unlocked: [] };
      } catch (err) {
        logger.warn("[useGamification] Falha ao carregar conquistas", { err }, "useGamification");
        return { all: [], unlocked: [] };
      }
    },
    enabled,
    staleTime: 1000 * 60 * 30,
  });

  // ── 6. Transações XP recentes ─────────────────────────────────────────────
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["xp-transactions", patientId],
    queryFn: async () => {
      try {
        const res = await gamificationApi.getTransactions(patientId);
        return (res.data ?? []).map((t) => ({
          id: t.id,
          amount: t.amount,
          reason: t.reason,
          created_at: t.created_at,
        }));
      } catch (err) {
        logger.warn("[useGamification] Falha ao carregar transações", { err }, "useGamification");
        return [];
      }
    },
    enabled,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const awardXp = useMutation<AwardXpResult, Error, AwardXpParams>({
    mutationFn: async ({ amount, reason, description }) => {
      const res = await gamificationApi.awardXp({
        patientId,
        amount,
        reason,
        description,
      });
      return {
        data: rowToProfile(res.data),
        leveledUp: res.leveledUp,
        newLevel: res.newLevel,
        streakExtended: res.streakExtended,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["gamification-profile", patientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["xp-transactions", patientId],
      });
      if (data.leveledUp) {
        triggerGamificationFeedback("level_up", { level: data.newLevel });
      } else {
        triggerGamificationFeedback("xp", {
          amount: data.data.total_points - (profile?.total_points ?? 0),
        });
      }
    },
  });

  const completeQuest = useMutation<void, Error, { questId: string }>({
    mutationFn: async ({ questId }) => {
      const res = await gamificationApi.completeQuest(patientId, questId);
      if (res.xpAwarded > 0) {
        await awardXp.mutateAsync({
          amount: res.xpAwarded,
          reason: "daily_quest",
          description: `Missão concluída`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-quests", patientId] });
    },
  });

  const buyItem = useMutation<void, Error, BuyItemParams>({
    mutationFn: async ({ itemId }) => {
      await gamificationApi.buyItem(patientId, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gamification-profile", patientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user-inventory", patientId],
      });
      toast({
        title: "Compra realizada!",
        description: "Item adicionado ao seu inventário.",
      });
    },
    onError: (err) => {
      toast({
        title: "Erro na compra",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const freezeStreak = useMutation<void, Error, void>({
    mutationFn: async () => {},
  });

  // ── Derived state ─────────────────────────────────────────────────────────

  const allAchievements = (achievementsData?.all ?? []) as Achievement[];
  const unlockedAchievements = (achievementsData?.unlocked ?? []) as UnlockedAchievement[];
  const lockedAchievements = allAchievements.filter(
    (a) => !unlockedAchievements.some((ua) => ua.achievement_id === a.id),
  );

  const calc = calculateLevel(profile?.total_points ?? 0);

  return {
    profile,
    isProfileNotFound,
    dailyQuests,
    allAchievements,
    unlockedAchievements,
    lockedAchievements,
    isLoading: isLoadingProfile,
    awardXp,
    completeQuest,
    freezeStreak,
    freezeCost: { price: 500, max_per_month: 2 },
    shopItems,
    userInventory,
    buyItem,
    xpPerLevel: calc.xpForNextLevel,
    currentLevel: calc.level,
    currentXp: calc.currentLevelXp,
    totalPoints: profile?.total_points ?? 0,
    progressToNextLevel: calc.xpForNextLevel - calc.currentLevelXp,
    progressPercentage: calc.progress,
    xpProgress: calc.progress,
    totalSessions: 12,
    recentTransactions,
  };
};

// Re-export Achievement for components that import it from here
export type { Achievement } from "@/types/gamification";
