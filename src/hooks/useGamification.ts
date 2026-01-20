import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateSmartQuests, GeneratedQuest } from '@/lib/gamification/quest-generator';
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

// Level Calculation Constants
const LEVEL_BASE_XP = 1000;
const LEVEL_MULTIPLIER = 1.2;

const calculateLevel = (totalXp: number) => {
  let level = 1;
  let xpForNextLevel = LEVEL_BASE_XP;
  let accumulatedXp = 0;

  while (totalXp >= accumulatedXp + xpForNextLevel) {
    accumulatedXp += xpForNextLevel;
    level++;
    xpForNextLevel = Math.floor(xpForNextLevel * LEVEL_MULTIPLIER);
  }

  return {
    level,
    currentLevelXp: totalXp - accumulatedXp,
    xpForNextLevel,
    progress: ((totalXp - accumulatedXp) / xpForNextLevel) * 100
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
  recentTransactions: any[]; // simplified
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
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .order('cost', { ascending: true });
      if (error) return [];
      return data as ShopItem[];
    },
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  const { data: userInventory = [] } = useQuery({
    queryKey: ['user-inventory', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_inventory')
        .select('*, item:shop_items(*)')
        .eq('user_id', patientId);
      if (error) return [];
      return data as UserInventoryItem[];
    },
    enabled: !!patientId,
  });

  // -------------------------------------------------------------------------
  // 2. Fetch Gamification Profile (Updated with Streak Freeze Logic)
  // -------------------------------------------------------------------------
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['gamification-profile', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_gamification')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create profile if not exists
        const { data: newProfile, error: createError } = await supabase
          .from('patient_gamification')
          .insert({ patient_id: patientId })
          .select()
          .single();
        
        if (createError) throw createError;
        return newProfile as GamificationProfile;
      }

      // Check Streak Logic with Inventory Protection
      if (data.last_activity_date) {
        const { shouldReset } = calculateNewStreak(
          data.current_streak,
          data.last_activity_date
        );

        if (shouldReset) {
          // Check for Streak Freeze in Inventory
          const { data: freezeItem } = await supabase
            .from('user_inventory')
            .select('*, item:shop_items!inner(code)')
            .eq('user_id', patientId)
            .eq('item.code', 'streak_freeze')
            .gt('quantity', 0)
            .maybeSingle();

          if (freezeItem) {
            // Consume Freeze
            const newQuantity = (freezeItem.quantity || 1) - 1;
            if (newQuantity === 0) {
               await supabase.from('user_inventory').delete().eq('id', freezeItem.id);
            } else {
               await supabase.from('user_inventory').update({ quantity: newQuantity }).eq('id', freezeItem.id);
            }

            // Save Streak (fake an activity for yesterday to keep it alive)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const { data: savedProfile } = await supabase
              .from('patient_gamification')
              .update({ last_activity_date: yesterday.toISOString() })
              .eq('id', data.id)
              .select()
              .single();
            
            if (savedProfile) {
               console.log("Streak Saved by Freeze!");
               return savedProfile as GamificationProfile;
            }
          }

          // No freeze available? Reset.
          const { data: updated, error: updateError } = await supabase
            .from('patient_gamification')
            .update({ current_streak: 0 })
            .eq('id', data.id)
            .select()
            .single();

          if (!updateError && updated) {
            return updated as GamificationProfile;
          }
        }
      }

      return data as GamificationProfile;
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
      const { data, error } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('patient_id', patientId)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') return [];

      if (data) {
        // Parse stored JSON
        const quests = data.quests_data as DailyQuestItem[];
        return quests;
      }

      // 2. No quests found? Generate Smart Quests!
      const smartQuests: GeneratedQuest[] = await generateSmartQuests(supabase, patientId);
      
      const newQuestsData: DailyQuestItem[] = smartQuests.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        xp: q.xp,
        completed: false,
        icon: q.icon
      }));

      // 3. Persist generated quests
      const { error: insertError } = await supabase
        .from('daily_quests')
        .insert({
          patient_id: patientId,
          date: today,
          quests_data: newQuestsData,
          completed_count: 0
        });

      if (insertError) {
        console.error("Failed to save generated quests:", insertError);
      }

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
      const [allRes, unlockedRes] = await Promise.all([
        supabase.from('achievements').select('*').eq('is_active', true),
        supabase.from('achievements_log').select('*').eq('patient_id', patientId)
      ]);

      return {
        all: (allRes.data as Achievement[]) || [],
        unlocked: (unlockedRes.data as UnlockedAchievement[]) || []
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
      const { data } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
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
      await supabase.from('xp_transactions').insert({
        patient_id: patientId,
        amount,
        reason,
        description
      });

      // 2. Update Profile
      const newTotalPoints = (profile.total_points || 0) + amount;
      const calc = calculateLevel(newTotalPoints); // simplified level logic based on total points for now, usually XP is cumulative

      // We need to fetch current XP to update accurately if we separate Points (Currency) from XP (Level)
      // For V2, let's assume total_points is the currency/score. 
      // If we want XP separate, we should have used current_xp column.
      // Let's stick to total_points for simplicity in this hook version.
      
      const { data: updatedProfile, error } = await supabase
        .from('patient_gamification')
        .update({
          total_points: newTotalPoints,
          level: calc.level,
          last_activity_date: new Date().toISOString()
        })
        .eq('patient_id', patientId)
        .select()
        .single();

      if (error) throw error;

      return {
        newLevel: updatedProfile.level,
        newXp: updatedProfile.total_points, // using total points as XP for now
        leveledUp: updatedProfile.level > profile.level
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });
      queryClient.invalidateQueries({ queryKey: ['xp-transactions', patientId] });
      
      toast({
        title: `+${data.newXp - (profile?.total_points || 0)} XP Ganho!`,
        description: data.leveledUp ? "Parabéns! Você subiu de nível!" : "Continue assim!",
        variant: "default"
      });
    }
  });

  const completeQuest = useMutation<void, Error, { questId: string }>({
    mutationFn: async ({ questId }) => {
      const quest = dailyQuests.find(q => q.id === questId);
      if (!quest || quest.completed) return;

      // 1. Update Quest State locally (optimistic) or DB
      const updatedQuests = dailyQuests.map(q => q.id === questId ? { ...q, completed: true } : q);
      
      const { error } = await supabase
        .from('daily_quests')
        .update({ 
          quests_data: updatedQuests,
          completed_count: updatedQuests.filter(q => q.completed).length
        })
        .eq('patient_id', patientId)
        .eq('date', new Date().toISOString().split('T')[0]);

      if (error) throw error;

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
      const { error: pointsError } = await supabase
        .from('patient_gamification')
        .update({ total_points: profile.total_points - cost })
        .eq('patient_id', patientId);
      
      if (pointsError) throw pointsError;

      // 2. Add to Inventory
      const { data: existing } = await supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', patientId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_inventory')
          .update({ quantity: (existing.quantity || 1) + 1 })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_inventory')
          .insert({ user_id: patientId, item_id: itemId, quantity: 1 });
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