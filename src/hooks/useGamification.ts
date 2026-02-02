/**
 * useGamification - Migrated to Firebase
 */

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, limit, setDoc } from '@/integrations/firebase/app';
import { triggerGamificationFeedback } from "@/lib/gamification/feedback-utils";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateSmartQuests, GeneratedQuest } from '@/lib/gamification/quest-generator';
import { fisioLogger as logger } from '@/lib/errors/logger';
import {
  DailyQuestItem,
  GamificationProfile,
  Achievement,
  UnlockedAchievement,
  XpTransactionReason,
  AwardXpParams,
  AwardXpResult,
  CompleteQuestParams,
  QuestItem,
  parseAchievementRequirements,
  type AchievementRequirement,
  type ShopItem,
  type UserInventoryItem,
  type BuyItemParams,
} from '@/types/gamification';
import { db } from '@/integrations/firebase/app';


// Level Calculation Constants - buscar do banco se disponível
const LEVEL_BASE_XP = 1000;
const LEVEL_MULTIPLIER = 1.2;

const calculateLevel = (totalXp: number, settings?: { base_xp?: number; multiplier?: number }) => {
  const baseXP = settings?.base_xp || LEVEL_BASE_XP;
  const multiplier = settings?.multiplier || LEVEL_MULTIPLIER;

  let level = 1;
  let xpForNextLevel = baseXP;
  let accumulatedXp = 0;

  while (totalXp >= accumulatedXp + xpForNextLevel) {
    accumulatedXp += xpForNextLevel;
    level++;
    xpForNextLevel = Math.floor(xpForNextLevel * multiplier);
  }

  return {
    level,
    currentLevelXp: totalXp - accumulatedXp,
    xpForNextLevel,
    progress: xpForNextLevel > 0 ? ((totalXp - accumulatedXp) / xpForNextLevel) * 100 : 100
  };
};

const calculateNewStreak = (currentStreak: number, lastActivityDate: string | null) => {
  if (!lastActivityDate) return { newStreak: 1, shouldReset: false };

  const today = new Date();
  const lastDate = parseISO(lastActivityDate);
  const diffDays = differenceInCalendarDays(today, lastDate);

  if (diffDays === 0) return { newStreak: currentStreak, shouldReset: false }; // Same day
  if (diffDays === 1) return { newStreak: currentStreak, shouldReset: false }; // Consecutive day

  return { newStreak: 1, shouldReset: true }; // Missed a day
};

export interface UseGamificationResult {
  profile: GamificationProfile | null;
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

  // Computed
  xpPerLevel: number;
  currentLevel: number;
  currentXp: number;
  totalPoints: number;
  progressToNextLevel: number;
  progressPercentage: number;
  xpProgress: number; // same as progressPercentage, alias
  totalSessions: number; // mock or real
  recentTransactions: Array<{ id: string; amount: number; reason: string; created_at: string }>; // simplified
}

export const useGamification = (patientId: string): UseGamificationResult => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // -------------------------------------------------------------------------
  // 1. Shop & Inventory Queries
  // -------------------------------------------------------------------------
  const { data: shopItems = [] } = useQuery({
    queryKey: ['shop-items'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'shop_items'),
        where('is_active', '==', true),
        orderBy('cost', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShopItem[];
    },
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  const { data: userInventory = [] } = useQuery({
    queryKey: ['user-inventory', patientId],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'user_inventory'),
        where('user_id', '==', patientId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserInventoryItem[];
    },
    enabled: !!patientId,
  });

  // -------------------------------------------------------------------------
  // 2. Fetch Gamification Profile (Updated with Streak Freeze Logic)
  // -------------------------------------------------------------------------
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['gamification-profile', patientId],
    queryFn: async () => {
      const docRef = doc(db, 'patient_gamification', patientId);
      const snapshot = await getDoc(docRef);

      let data = null;
      if (snapshot.exists()) {
        data = { id: snapshot.id, ...snapshot.data() } as GamificationProfile;
      }

      if (!data) {
        // Create profile if not exists
        const newProfile = {
          patient_id: patientId,
          total_points: 0,
          level: 1,
          current_streak: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as GamificationProfile;

        await setDoc(docRef, newProfile);
        return newProfile;
      }

      // Check Streak Logic with Inventory Protection
      if (data.last_activity_date) {
        const { shouldReset } = calculateNewStreak(
          data.current_streak,
          data.last_activity_date
        );

        if (shouldReset) {
          // Check for Streak Freeze in Inventory
          const freezeQ = firestoreQuery(
            collection(db, 'user_inventory'),
            where('user_id', '==', patientId),
            where('item_code', '==', 'streak_freeze'),
            where('quantity', '>', 0),
            limit(1)
          );

          const freezeSnapshot = await getDocs(freezeQ);

          if (!freezeSnapshot.empty) {
            const freezeItem = { id: freezeSnapshot.docs[0].id, ...freezeSnapshot.docs[0].data() };

            // Consume Freeze
            const newQuantity = (freezeItem.quantity || 1) - 1;
            if (newQuantity === 0) {
              await deleteDoc(doc(db, 'user_inventory', freezeItem.id));
            } else {
              await updateDoc(doc(db, 'user_inventory', freezeItem.id), { quantity: newQuantity });
            }

            // Save Streak (fake an activity for yesterday to keep it alive)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            await updateDoc(docRef, { last_activity_date: yesterday.toISOString() });

            const updatedSnap = await getDoc(docRef);
            if (updatedSnap.exists()) {
              logger.info('Streak Saved by Freeze', null, 'useGamification');
              return { id: updatedSnap.id, ...updatedSnap.data() } as GamificationProfile;
            }
          }

          // No freeze available? Reset.
          await updateDoc(docRef, { current_streak: 0 });

          const updatedSnap = await getDoc(docRef);
          if (updatedSnap.exists()) {
            return { id: updatedSnap.id, ...updatedSnap.data() } as GamificationProfile;
          }
        }
      }

      return data;
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 2,
  });

  // -------------------------------------------------------------------------
  // 3. Fetch Daily Quests (Smart Generation)
  // -------------------------------------------------------------------------
  const { data: dailyQuests = [] } = useQuery({
    queryKey: ['daily-quests', patientId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // 1. Try to get existing quests for today
      const q = firestoreQuery(
        collection(db, 'daily_quests'),
        where('patient_id', '==', patientId),
        where('date', '==', today),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        // Parse stored JSON
        const quests = data.quests_data as DailyQuestItem[];
        return quests;
      }

      // 2. No quests found? Generate Smart Quests!
      const smartQuests: GeneratedQuest[] = await generateSmartQuests(patientId);

      const newQuestsData: DailyQuestItem[] = smartQuests.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        xp: q.xp,
        completed: false,
        icon: q.icon
      }));

      // 3. Persist generated quests
      await addDoc(collection(db, 'daily_quests'), {
        patient_id: patientId,
        date: today,
        quests_data: newQuestsData,
        completed_count: 0,
        created_at: new Date().toISOString(),
      });

      return newQuestsData;
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // -------------------------------------------------------------------------
  // 4. Fetch Achievements
  // -------------------------------------------------------------------------
  const { data: achievementsData } = useQuery({
    queryKey: ['achievements', patientId],
    queryFn: async () => {
      const [allSnapshot, unlockedSnapshot] = await Promise.all([
        getDocs(firestoreQuery(collection(db, 'achievements'), where('is_active', '==', true))),
        getDocs(firestoreQuery(collection(db, 'achievements_log'), where('patient_id', '==', patientId)))
      ]);

      return {
        all: allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Achievement[],
        unlocked: unlockedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UnlockedAchievement[]
      };
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  // -------------------------------------------------------------------------
  // 5. Fetch Recent Transactions
  // -------------------------------------------------------------------------
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['xp-transactions', patientId],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'xp_transactions'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
    },
    enabled: !!patientId
  });

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const awardXp = useMutation<AwardXpResult, Error, AwardXpParams>({
    mutationFn: async ({ amount, reason, description }) => {
      if (!profile) throw new Error("Profile not loaded");

      // 1. Log Transaction
      await addDoc(collection(db, 'xp_transactions'), {
        patient_id: patientId,
        amount,
        reason,
        description,
        created_at: new Date().toISOString(),
      });

      // 2. Update Profile
      const newTotalPoints = (profile.total_points || 0) + amount;
      const calc = calculateLevel(newTotalPoints);

      const docRef = doc(db, 'patient_gamification', patientId);
      await updateDoc(docRef, {
        total_points: newTotalPoints,
        level: calc.level,
        last_activity_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Fetch updated profile
      const updatedSnap = await getDoc(docRef);
      const updatedProfile = { id: updatedSnap.id, ...updatedSnap.data() } as GamificationProfile;

      return {
        newLevel: updatedProfile.level,
        newXp: updatedProfile.total_points,
        leveledUp: updatedProfile.level > profile.level
      };
    },


    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });
      queryClient.invalidateQueries({ queryKey: ['xp-transactions', patientId] });

      if (data.leveledUp) {
        triggerGamificationFeedback('level_up', { level: data.newLevel });
      } else {
        triggerGamificationFeedback('xp', { amount: data.newXp - (profile?.total_points || 0) });
      }
    }
  });

  const completeQuest = useMutation<void, Error, { questId: string }>({
    mutationFn: async ({ questId }) => {
      const quest = dailyQuests.find(q => q.id === questId);
      if (!quest || quest.completed) return;

      // 1. Update Quest State locally (optimistic) or DB
      const updatedQuests = dailyQuests.map(q => q.id === questId ? { ...q, completed: true } : q);

      const today = new Date().toISOString().split('T')[0];
      const q = firestoreQuery(
        collection(db, 'daily_quests'),
        where('patient_id', '==', patientId),
        where('date', '==', today),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, {
          quests_data: updatedQuests,
          completed_count: updatedQuests.filter(q => q.completed).length,
          updated_at: new Date().toISOString(),
        });
      }

      // 2. Award XP
      await awardXp.mutateAsync({
        amount: quest.xp,
        reason: 'daily_quest',
        description: `Missão: ${quest.title}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-quests', patientId] });
    }
  });

  const buyItem = useMutation<void, Error, BuyItemParams>({
    mutationFn: async ({ itemId, cost }) => {
      if (!profile) throw new Error("Perfil não carregado");
      if (profile.total_points < cost) throw new Error("Pontos insuficientes");

      // 1. Deduct Points
      const docRef = doc(db, 'patient_gamification', patientId);
      await updateDoc(docRef, {
        total_points: profile.total_points - cost,
        updated_at: new Date().toISOString(),
      });

      // 2. Add to Inventory
      const q = firestoreQuery(
        collection(db, 'user_inventory'),
        where('user_id', '==', patientId),
        where('item_id', '==', itemId),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, {
          quantity: (snapshot.docs[0].data().quantity || 1) + 1,
          updated_at: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'user_inventory'), {
          user_id: patientId,
          item_id: itemId,
          quantity: 1,
          created_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });
      queryClient.invalidateQueries({ queryKey: ['user-inventory', patientId] });
      toast({
        title: "Compra realizada!",
        description: "Item adicionado ao seu inventário.",
      });
    },
    onError: (err) => {
      toast({
        title: "Erro na compra",
        description: err.message,
        variant: "destructive"
      });
    }
  });

  // Placeholder for explicit streak freeze manual action if needed (redundant now with auto-check)
  const freezeStreak = useMutation<void, Error, void>({
    mutationFn: async () => {},
    onSuccess: () => {}
  });

  // Derived State
  const allAchievements = achievementsData?.all || [];
  const unlockedAchievements = achievementsData?.unlocked || [];
  const lockedAchievements = allAchievements.filter(
    a => !unlockedAchievements.some(ua => ua.achievement_id === a.id)
  );

  const calc = calculateLevel(profile?.total_points || 0);

  return {
    profile: profile || null,
    dailyQuests,
    allAchievements,
    unlockedAchievements,
    lockedAchievements,
    isLoading: isLoadingProfile,
    awardXp,
    completeQuest,
    freezeStreak,
    freezeCost: { price: 500, max_per_month: 2 }, // legacy/fallback
    shopItems,
    userInventory,
    buyItem,

    // Computed Values
    xpPerLevel: calc.xpForNextLevel,
    currentLevel: calc.level,
    currentXp: calc.currentLevelXp,
    totalPoints: profile?.total_points || 0,
    progressToNextLevel: calc.xpForNextLevel - calc.currentLevelXp,
    progressPercentage: calc.progress,
    xpProgress: calc.progress,
    totalSessions: 12, // mock
    recentTransactions
  };
};
