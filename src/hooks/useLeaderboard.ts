/**
 * useLeaderboard - Migrated to Firebase
 */

import { useEffect, useState } from 'react';
import { collection, getDocs, query as firestoreQuery, where, orderBy, limit } from '@/integrations/firebase/app';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subDays, differenceInCalendarDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

  LeaderboardEntry,
  LeaderboardFilters,
  EngagementData,
} from '@/types/gamification';
import { downloadCSV } from '@/utils/csvExport';
import { db } from '@/integrations/firebase/app';


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
      // Build base query
      const sortColumn = filters.sortBy === 'total_xp' ? 'total_points' : filters.sortBy;
      const baseQuery = firestoreQuery(
        collection(db, 'patient_gamification'),
        orderBy(sortColumn, filters.order === 'asc' ? 'asc' : 'desc')
      );

      const snapshot = await getDocs(baseQuery);

      // Get all gamification data
      let gamificationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply period filter (client-side for date range + sort combo)
      if (filters.period === 'week') {
        const weekAgo = subDays(new Date(), 7);
        gamificationData = gamificationData.filter((p) => {
          const lastActivity = p.last_activity_date ? new Date(p.last_activity_date) : null;
          return lastActivity && lastActivity >= weekAgo;
        });
      } else if (filters.period === 'month') {
        const monthAgo = subDays(new Date(), 30);
        gamificationData = gamificationData.filter((p) => {
          const lastActivity = p.last_activity_date ? new Date(p.last_activity_date) : null;
          return lastActivity && lastActivity >= monthAgo;
        });
      }

      // Get total count before pagination
      const totalCount = gamificationData.length;

      // Fetch patient names for search filter and display
      const patientIds = gamificationData.map((p) => p.id);
      const patientsMap: Record<string, unknown> = {};

      // Fetch patient data in batches (Firestore limitation)
      for (const patientId of patientIds) {
        const patientQuery = firestoreQuery(
          collection(db, 'patients'),
          where('__name__', '==', patientId),
          limit(1)
        );
        const patientSnap = await getDocs(patientQuery);
        if (!patientSnap.empty) {
          patientsMap[patientId] = patientSnap.docs[0].data();
        }
      }

      // Apply search filter
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.trim().toLowerCase();
        gamificationData = gamificationData.filter((p: { id: string; [key: string]: unknown }) => {
          const patientName = (patientsMap[p.id]?.full_name as string) || '';
          return patientName.toLowerCase().includes(searchLower);
        });
      }

      // Re-sort after filtering (since we fetched all sorted data initially)
      const descOrder = filters.order === 'desc';
      gamificationData.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aVal = (a[sortColumn] as number) || 0;
        const bVal = (b[sortColumn] as number) || 0;
        return descOrder ? bVal - aVal : aVal - bVal;
      });

      // Apply pagination
      const from = (filters.page - 1) * filters.pageSize;
      const paginatedData = gamificationData.slice(from, from + filters.pageSize);

      if (paginatedData.length === 0) {
        return { leaderboard: [], totalCount };
      }

      interface GamificationData {
        id: string;
        level: number;
        total_points?: number;
        current_streak?: number;
        longest_streak?: number;
        last_activity_date?: string;
      }

      // Get achievement counts for paginated patients
      const paginatedPatientIds = paginatedData.map((p: GamificationData) => p.id);
      const achievementMap: Record<string, number> = {};

      for (const patientId of paginatedPatientIds) {
        const achievementsQuery = firestoreQuery(
          collection(db, 'achievements_log'),
          where('patient_id', '==', patientId)
        );
        const achievementsSnap = await getDocs(achievementsQuery);
        achievementMap[patientId] = achievementsSnap.size;
      }

      // Transform data to leaderboard entries
      const leaderboard: LeaderboardEntry[] = paginatedData.map((p: GamificationData, index) => {
        const patientInfo = patientsMap[p.id] || {};
        const entry: LeaderboardEntry = {
          patient_id: p.id,
          patient_name: patientInfo.full_name || 'Desconhecido',
          email: patientInfo.email,
          level: p.level,
          total_xp: p.total_points || 0,
          current_streak: p.current_streak || 0,
          longest_streak: p.longest_streak || 0,
          achievements_count: achievementMap[p.id] || 0,
          last_activity: p.last_activity_date || '',
        };

        // Calculate rank based on sorted position
        entry.rank = from + index + 1;

        return entry;
      });

      return {
        leaderboard,
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

export const useEngagementData = (defaultDays: number = 30): UseEngagementDataResult => {
  const [days, setDays] = useState(defaultDays);

  const { data, isLoading } = useQuery({
    queryKey: ['gamification-engagement-data', days],
    queryFn: async (): Promise<EngagementData[]> => {
      const startDate = subDays(new Date(), days);

      const q = firestoreQuery(
        collection(db, 'xp_transactions'),
        where('created_at', '>=', startDate.toISOString()),
        orderBy('created_at', 'asc')
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) return [];

      const transactions = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

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
