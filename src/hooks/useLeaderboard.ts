import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, differenceInCalendarDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  LeaderboardEntry,
  LeaderboardFilters,
  EngagementData,
} from '@/types/gamification';
import { downloadCSV } from '@/utils/csvExport';

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
  period: 'all',
  category: 'level',
  search: '',
  sortBy: 'level',
  order: 'desc',
  page: 1,
  pageSize: 20,
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for leaderboard with filtering, sorting, and pagination
 */
export const useLeaderboard = (initialFilters?: Partial<LeaderboardFilters>): UseLeaderboardResult => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFiltersState] = useState<LeaderboardFilters>({ ...DEFAULT_FILTERS, ...initialFilters });

  const setFilters = (newFilters: Partial<LeaderboardFilters>) => {
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters };
      // Reset to page 1 if filters changed (not just page change)
      if (newFilters.page === undefined) {
        updated.page = 1;
      }
      return updated;
    });
  };

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gamification-leaderboard', filters],
    queryFn: async (): Promise<{ leaderboard: LeaderboardEntry[]; totalCount: number }> => {
      let query = supabase
        .from('patient_gamification')
        .select(`
          patient_id,
          level,
          total_points,
          current_streak,
          longest_streak,
          last_activity_date,
          patients!inner(full_name, email)
        `);

      // Apply period filter
      if (filters.period === 'week') {
        const weekAgo = subDays(new Date(), 7).toISOString();
        query = query.gte('last_activity_date', weekAgo);
      } else if (filters.period === 'month') {
        const monthAgo = subDays(new Date(), 30).toISOString();
        query = query.gte('last_activity_date', monthAgo);
      }

      // Apply search filter
      if (filters.search && filters.search.trim()) {
        query = query.ilike('patients.full_name', `%${filters.search.trim()}%`);
      }

      // Apply sorting
      const sortColumn = filters.sortBy === 'total_xp' ? 'total_points' : filters.sortBy;
      query = query.order(sortColumn, { ascending: filters.order === 'asc' });

      // Get total count for pagination
      const { count: totalCount } = await query;

      // Apply pagination
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return { leaderboard: [], totalCount: totalCount || 0 };
      }

      // Get achievement counts for all patients in one query
      const patientIds = data.map((p: any) => p.patient_id);
      const { data: achievementsData } = await supabase
        .from('achievements_log')
        .select('patient_id, achievement_id')
        .in('patient_id', patientIds);

      // Count achievements per patient
      const achievementMap = (achievementsData || []).reduce((acc, log) => {
        acc[log.patient_id] = (acc[log.patient_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Transform data to leaderboard entries
      const leaderboard: LeaderboardEntry[] = data.map((p: any, index) => {
        const entry: LeaderboardEntry = {
          patient_id: p.patient_id,
          patient_name: p.patients?.full_name || 'Desconhecido',
          email: p.patients?.email,
          level: p.level,
          total_xp: p.total_points || 0,
          current_streak: p.current_streak || 0,
          longest_streak: p.longest_streak || 0,
          achievements_count: achievementMap[p.patient_id] || 0,
          last_activity: p.last_activity_date || '',
        };

        // Calculate rank based on sorted position
        entry.rank = from + index + 1;

        return entry;
      });

      return {
        leaderboard,
        totalCount: totalCount || 0,
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
        title: 'Sem dados para exportar',
        description: 'Não há pacientes no ranking para exportar',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Posição', 'Paciente', 'Email', 'Nível', 'XP Total', 'Streak Atual', 'Streak Recorde', 'Conquistas', 'Última Atividade'];

    const rows = data.leaderboard.map(entry => {
      const lastActivity = entry.last_activity
        ? new Date(entry.last_activity).toLocaleString('pt-BR')
        : 'Nunca';

      return [
        entry.rank || '',
        `"${entry.patient_name.replace(/"/g, '""')}"`,
        entry.email || '',
        entry.level,
        entry.total_xp,
        entry.current_streak,
        entry.longest_streak,
        entry.achievements_count,
        `"${lastActivity}"`,
      ].join(';');
    });

    const csv = [headers.join(';'), ...rows].join('\n');
    const filename = `ranking_gamificacao_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csv, filename);

    toast({
      title: 'Exportação concluída',
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

// ============================================================================
// ENGAGEMENT DATA HOOK
// ============================================================================

export interface UseEngagementDataResult {
  data: EngagementData[];
  isLoading: boolean;
  days: number;
  setDays: (days: number) => void;
}

/**
 * Hook for engagement data with configurable time range
 */
export const useEngagementData = (defaultDays: number = 30): UseEngagementDataResult => {
  const [days, setDays] = useState(defaultDays);

  const { data, isLoading } = useQuery({
    queryKey: ['gamification-engagement-data', days],
    queryFn: async (): Promise<EngagementData[]> => {
      const startDate = subDays(new Date(), days).toISOString();

      const { data: transactions } = await supabase
        .from('xp_transactions')
        .select('created_at, amount, reason, patient_id')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      if (!transactions || transactions.length === 0) return [];

      // Group by date
      const grouped = transactions.reduce((acc, t) => {
        const date = t.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            activePatients: 0,
            questsCompleted: 0,
            xpAwarded: 0,
            achievementsUnlocked: 0,
          };
        }
        acc[date].xpAwarded += t.amount;
        if (t.reason === 'daily_quest') acc[date].questsCompleted++;
        if (t.reason === 'achievement_unlocked') acc[date].achievementsUnlocked++;
        return acc;
      }, {} as Record<string, EngagementData>);

      // Count unique patients per date
      const seenPatients = new Set<string>();
      transactions.forEach(t => {
        const date = t.created_at.split('T')[0];
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
        const date = subDays(new Date(), i).toISOString().split('T')[0];
        result.push(grouped[date] || {
          date,
          activePatients: 0,
          questsCompleted: 0,
          xpAwarded: 0,
          achievementsUnlocked: 0,
        });
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
