/**
 * useLeaderboard - Migrated to Neon/Workers
 */

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { gamificationApi } from "@/api/v2";
import { LeaderboardEntry, LeaderboardFilters, EngagementData } from "@/types/gamification";
import { downloadCSV } from "@/utils/csvExport";
import { subDays } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface UseLeaderboardResult {
  leaderboard: LeaderboardEntry[];
  totalCount: number;
  totalPages: number;
  isLoading: boolean;
  filters: LeaderboardFilters;
  setFilters: (filters: Partial<LeaderboardFilters>) => void;
  exportToCSV: () => void;
  refresh: () => void;
}

const DEFAULT_FILTERS: LeaderboardFilters = {
  period: "all",
  category: "level",
  search: "",
  sortBy: "level",
  order: "desc",
  page: 1,
  pageSize: 20,
};

// ============================================================================
// HOOK
// ============================================================================

export const useLeaderboard = (
  initialFilters?: Partial<LeaderboardFilters>,
): UseLeaderboardResult => {
  const { toast } = useToast();
  const _queryClient = useQueryClient();
  const [filters, setFiltersState] = useState<LeaderboardFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const setFilters = useCallback((newFilters: Partial<LeaderboardFilters>) => {
    setFiltersState((prev) => {
      const updated = { ...prev, ...newFilters };
      // Reset to page 1 if filters changed (not just page change)
      if (newFilters.page === undefined) {
        updated.page = 1;
      }
      return updated;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["gamification-leaderboard", filters],
    queryFn: async (): Promise<{
      leaderboard: LeaderboardEntry[];
      totalCount: number;
    }> => {
      const period =
        filters.period === "week" ? "weekly" : filters.period === "month" ? "monthly" : "all";
      const res = await gamificationApi.getLeaderboard({ period, limit: 100 });
      let leaderboard = (res.data ?? []).map((entry) => ({
        rank: entry.rank,
        patient_id: entry.patient_id,
        patient_name: entry.patient_name,
        email: entry.email || "",
        level: entry.current_level,
        total_xp: entry.total_xp,
        current_streak: entry.current_streak,
        longest_streak: entry.longest_streak || 0,
        achievements_count: 0,
        last_activity: entry.last_activity_date || "",
      })) as LeaderboardEntry[];

      if (filters.search.trim()) {
        const searchLower = filters.search.trim().toLowerCase();
        leaderboard = leaderboard.filter((entry) =>
          entry.patient_name.toLowerCase().includes(searchLower),
        );
      }

      const sortBy = filters.sortBy;
      leaderboard.sort((a, b) => {
        const dir = filters.order === "asc" ? 1 : -1;
        const av =
          sortBy === "total_xp"
            ? a.total_xp
            : sortBy === "current_streak"
              ? a.current_streak
              : sortBy === "longest_streak"
                ? a.longest_streak
                : sortBy === "achievements_count"
                  ? a.achievements_count
                  : sortBy === "last_activity"
                    ? new Date(a.last_activity || 0).getTime()
                    : a.level;
        const bv =
          sortBy === "total_xp"
            ? b.total_xp
            : sortBy === "current_streak"
              ? b.current_streak
              : sortBy === "longest_streak"
                ? b.longest_streak
                : sortBy === "achievements_count"
                  ? b.achievements_count
                  : sortBy === "last_activity"
                    ? new Date(b.last_activity || 0).getTime()
                    : b.level;
        return av > bv ? dir : av < bv ? -dir : 0;
      });

      const totalCount = leaderboard.length;
      const from = (filters.page - 1) * filters.pageSize;
      return {
        leaderboard: leaderboard.slice(from, from + filters.pageSize).map((entry, index) => ({
          ...entry,
          rank: from + index + 1,
        })),
        totalCount,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,
  });

  const totalPages = data ? Math.ceil(data.totalCount / filters.pageSize) : 0;

  // -------------------------------------------------------------------------
  // Export to CSV
  // -------------------------------------------------------------------------
  const exportToCSV = () => {
    if (!data || data.leaderboard.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Não há pacientes no ranking para exportar",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Posição",
      "Paciente",
      "Email",
      "Nível",
      "XP Total",
      "Streak Atual",
      "Streak Recorde",
      "Conquistas",
      "Última Atividade",
    ];

    const rows = data.leaderboard.map((entry) => {
      const lastActivity = entry.last_activity
        ? new Date(entry.last_activity).toLocaleString("pt-BR")
        : "Nunca";

      return [
        entry.rank || "",
        `"${entry.patient_name.replace(/"/g, '""')}"`,
        entry.email || "",
        entry.level,
        entry.total_xp,
        entry.current_streak,
        entry.longest_streak,
        entry.achievements_count,
        `"${lastActivity}"`,
      ].join(";");
    });

    const csv = [headers.join(";"), ...rows].join("\n");
    const filename = `ranking_gamificacao_${new Date().toISOString().split("T")[0]}.csv`;

    downloadCSV(csv, filename);

    toast({
      title: "Exportação concluída",
      description: `${data.leaderboard.length} registros exportados para ${filename}`,
    });
  };

  return {
    leaderboard: data?.leaderboard || [],
    totalCount: data?.totalCount || 0,
    totalPages,
    isLoading,
    filters,
    setFilters,
    exportToCSV,
    refresh: () => refetch(),
  };
};

export interface UseEngagementDataResult {
  data: EngagementData[];
  isLoading: boolean;
  days: number;
  setDays: (days: number) => void;
}

export const useEngagementData = (defaultDays: number = 30): UseEngagementDataResult => {
  const [days, setDays] = useState(defaultDays);

  const { data, isLoading } = useQuery({
    queryKey: ["gamification-engagement-data", days],
    queryFn: async (): Promise<EngagementData[]> => {
      const res = await gamificationApi.listTransactions({ days, limit: 5000 });
      const transactions = res.data ?? [];
      if (transactions.length === 0) return [];

      // Group by date
      const grouped = transactions.reduce(
        (acc, t) => {
          const date = t.created_at.split("T")[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              activePatients: 0,
              questsCompleted: 0,
              xpAwarded: 0,
              achievementsUnlocked: 0,
            };
          }
          acc[date].xpAwarded += t.amount || 0;
          if (t.reason === "daily_quest") acc[date].questsCompleted++;
          if (t.reason === "achievement_unlocked") acc[date].achievementsUnlocked++;
          return acc;
        },
        {} as Record<string, EngagementData>,
      );

      // Count unique patients per date
      const seenPatients = new Set<string>();
      transactions.forEach((t) => {
        const date = t.created_at.split("T")[0];
        const key = `${date}-${t.patient_id}`;
        if (!seenPatients.has(key)) {
          seenPatients.add(key);
          if (grouped[date]) {
            grouped[date].activePatients++;
          }
        }
      });

      // Fill in missing dates
      const result: EngagementData[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i).toISOString().split("T")[0];
        result.push(
          grouped[date] || {
            date,
            activePatients: 0,
            questsCompleted: 0,
            xpAwarded: 0,
            achievementsUnlocked: 0,
          },
        );
      }

      return result;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  return {
    data: data || [],
    isLoading,
    days,
    setDays,
  };
};
