import { request } from './base';
import type {
  GamificationProfileRow,
  DailyQuestRow,
  AchievementRow,
  AchievementLogRow,
  XpTransactionRow,
  GamificationLeaderboardRow,
  ShopItemRow,
  UserInventoryRow,
  GamificationSettingRow,
  GamificationStats,
  AtRiskPatient,
  PopularAchievement,
  QuestDefinitionRow,
  WeeklyChallengeRow,
  PatientChallengeRow,
} from '@/types/workers';

export const gamificationApi = {
  awardXp: (data: { patientId: string; amount: number; reason: string; description?: string }) =>
    request<{ data: GamificationProfileRow; leveledUp: boolean; newLevel: number; streakExtended: boolean }>('/api/gamification/award-xp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: (patientId: string) =>
    request<{ data: GamificationProfileRow }>(`/api/gamification/profile/${encodeURIComponent(patientId)}`),

  getQuests: (patientId: string) =>
    request<{ data: DailyQuestRow }>(`/api/gamification/quests/${encodeURIComponent(patientId)}`),

  completeQuest: (patientId: string, questId: string) =>
    request<{ data: DailyQuestRow; xpAwarded: number }>(`/api/gamification/quests/${encodeURIComponent(patientId)}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ questId }),
    }),

  getAchievements: (patientId: string) =>
    request<{ data: { all: AchievementRow[]; unlocked: AchievementLogRow[] } }>(`/api/gamification/achievements/${encodeURIComponent(patientId)}`),

  getTransactions: (patientId: string) =>
    request<{ data: XpTransactionRow[] }>(`/api/gamification/transactions/${encodeURIComponent(patientId)}`),
  listTransactions: (params?: { days?: number; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value)]),
      ),
    ).toString();
    return request<{ data: XpTransactionRow[] }>(`/api/gamification/transactions${qs ? `?${qs}` : ''}`);
  },

  getLeaderboard: (params?: { period?: 'weekly' | 'monthly' | 'all'; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value)]),
      ),
    ).toString();
    return request<{ data: GamificationLeaderboardRow[] }>(`/api/gamification/leaderboard${qs ? `?${qs}` : ''}`);
  },

  getShopItems: () =>
    request<{ data: ShopItemRow[] }>('/api/gamification/shop'),

  getAllShopItems: () =>
    request<{ data: ShopItemRow[] }>('/api/gamification/shop-items'),

  getInventory: (patientId: string) =>
    request<{ data: UserInventoryRow[] }>(`/api/gamification/inventory/${encodeURIComponent(patientId)}`),

  buyItem: (patientId: string, itemId: string) =>
    request<{ data: GamificationProfileRow }>('/api/gamification/buy', {
      method: 'POST',
      body: JSON.stringify({ patientId, itemId }),
    }),

  getSettings: () =>
    request<{ data: GamificationSettingRow[] }>('/api/gamification/settings'),

  updateSettings: (settings: Record<string, unknown>) =>
    request<{ data: GamificationSettingRow[] }>('/api/gamification/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    }),

  getAdminStats: (days = 30) =>
    request<{ data: GamificationStats }>(`/api/gamification/admin/stats?days=${encodeURIComponent(String(days))}`),

  getAtRiskPatients: (params?: { days?: number; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value)]),
      ),
    ).toString();
    return request<{ data: AtRiskPatient[] }>(`/api/gamification/admin/at-risk${qs ? `?${qs}` : ''}`);
  },

  getPopularAchievements: (limit = 10) =>
    request<{ data: PopularAchievement[] }>(
      `/api/gamification/admin/popular-achievements?limit=${encodeURIComponent(String(limit))}`,
    ),

  adjustXp: (payload: { patientId: string; amount: number; reason: string }) =>
    request<{ data: GamificationProfileRow }>('/api/gamification/admin/adjust-xp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetStreak: (patientId: string) =>
    request<{ data: GamificationProfileRow | null }>('/api/gamification/admin/reset-streak', {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    }),

  achievementDefinitions: {
    list: () =>
      request<{ data: AchievementRow[] }>('/api/gamification/achievement-definitions'),
    create: (data: Partial<AchievementRow>) =>
      request<{ data: AchievementRow }>('/api/gamification/achievement-definitions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<AchievementRow>) =>
      request<{ data: AchievementRow }>(`/api/gamification/achievement-definitions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/gamification/achievement-definitions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  questDefinitions: {
    list: () =>
      request<{ data: QuestDefinitionRow[] }>('/api/gamification/quest-definitions'),
    create: (data: Partial<QuestDefinitionRow>) =>
      request<{ data: QuestDefinitionRow }>('/api/gamification/quest-definitions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<QuestDefinitionRow>) =>
      request<{ data: QuestDefinitionRow }>(`/api/gamification/quest-definitions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    setActive: (id: string, is_active: boolean) =>
      request<{ data: QuestDefinitionRow }>(`/api/gamification/quest-definitions/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/gamification/quest-definitions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  weeklyChallenges: {
    list: (params?: { active?: boolean; patientId?: string }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, value]) => value != null)
            .map(([key, value]) => [key, String(value)]),
        ),
      ).toString();
      return request<{ data: WeeklyChallengeRow[] }>(`/api/gamification/weekly-challenges${qs ? `?${qs}` : ''}`);
    },
    create: (data: Partial<WeeklyChallengeRow>) =>
      request<{ data: WeeklyChallengeRow }>('/api/gamification/weekly-challenges', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<WeeklyChallengeRow>) =>
      request<{ data: WeeklyChallengeRow }>(`/api/gamification/weekly-challenges/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    setActive: (id: string, is_active: boolean) =>
      request<{ data: WeeklyChallengeRow }>(`/api/gamification/weekly-challenges/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/gamification/weekly-challenges/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  getPatientChallenges: (patientId: string) =>
    request<{ data: PatientChallengeRow[] }>(`/api/gamification/patient-challenges/${encodeURIComponent(patientId)}`),

  shopAdmin: {
    create: (data: Partial<ShopItemRow>) =>
      request<{ data: ShopItemRow }>('/api/gamification/shop-items', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<ShopItemRow>) =>
      request<{ data: ShopItemRow }>(`/api/gamification/shop-items/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/gamification/shop-items/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },
};
