import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppointmentService } from '@/lib/services/AppointmentService';
import { getWeekStart, getWeekEnd, formatDate, addWeeks } from '@/utils/agendaUtils';
import type { 
  WeeklyCalendarData, 
  Appointment, 
  AgendaFilters 
} from '@/types/agenda';

// Query keys for React Query
export const agendaKeys = {
  all: ['agenda'] as const,
  weekly: (weekStart: Date) => [...agendaKeys.all, 'weekly', formatDate(weekStart)] as const,
  filtered: (filters: AgendaFilters) => [...agendaKeys.all, 'filtered', filters] as const,
};

interface UseAgendaOptions {
  initialWeek?: Date;
  filters?: AgendaFilters;
  enableRealtime?: boolean;
  prefetchWeeks?: number; // Number of adjacent weeks to prefetch
}

interface UseAgendaReturn {
  // Current week data
  currentWeek: Date;
  weeklyData: WeeklyCalendarData | undefined;
  isLoading: boolean;
  error: Error | null;
  
  // Navigation
  goToWeek: (date: Date) => void;
  goToToday: () => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  
  // Filters
  filters: AgendaFilters;
  setFilters: (filters: AgendaFilters) => void;
  clearFilters: () => void;
  
  // Utilities
  isCurrentWeek: boolean;
  weekRange: { start: Date; end: Date };
  timeSlots: string[];
  
  // Cache management
  prefetchAdjacentWeeks: () => void;
  invalidateWeek: (weekStart?: Date) => void;
  invalidateAll: () => void;
}

export function useAgenda(options: UseAgendaOptions = {}): UseAgendaReturn {
  const {
    initialWeek = new Date(),
    filters: initialFilters = {},
    enableRealtime = true,
    prefetchWeeks = 2
  } = options;

  const queryClient = useQueryClient();
  
  // State management
  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(initialWeek));
  const [filters, setFilters] = useState<AgendaFilters>(initialFilters);

  // Memoized values
  const weekRange = useMemo(() => ({
    start: currentWeek,
    end: getWeekEnd(currentWeek)
  }), [currentWeek]);

  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const thisWeekStart = getWeekStart(today);
    return formatDate(currentWeek) === formatDate(thisWeekStart);
  }, [currentWeek]);

  // Main query for weekly data
  const {
    data: weeklyData,
    isLoading,
    error
  } = useQuery({
    queryKey: agendaKeys.weekly(currentWeek),
    queryFn: () => AppointmentService.getWeeklyAppointments(currentWeek),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchInterval: enableRealtime ? 30 * 1000 : false, // 30 seconds if realtime enabled
  });

  // Navigation functions
  const goToWeek = useCallback((date: Date) => {
    const weekStart = getWeekStart(date);
    setCurrentWeek(weekStart);
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    const weekStart = getWeekStart(today);
    setCurrentWeek(weekStart);
  }, []);

  const goToPreviousWeek = useCallback(() => {
    setCurrentWeek(prev => addWeeks(prev, -1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  }, []);

  // Filter management
  const handleSetFilters = useCallback((newFilters: AgendaFilters) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Cache management functions
  const prefetchAdjacentWeeks = useCallback(() => {
    for (let i = 1; i <= prefetchWeeks; i++) {
      // Prefetch previous weeks
      const prevWeek = addWeeks(currentWeek, -i);
      queryClient.prefetchQuery({
        queryKey: agendaKeys.weekly(prevWeek),
        queryFn: () => AppointmentService.getWeeklyAppointments(prevWeek),
        staleTime: 5 * 60 * 1000, // 5 minutes for prefetched data
      });

      // Prefetch next weeks
      const nextWeek = addWeeks(currentWeek, i);
      queryClient.prefetchQuery({
        queryKey: agendaKeys.weekly(nextWeek),
        queryFn: () => AppointmentService.getWeeklyAppointments(nextWeek),
        staleTime: 5 * 60 * 1000, // 5 minutes for prefetched data
      });
    }
  }, [currentWeek, prefetchWeeks, queryClient]);

  // Intelligent cache management
  const manageCacheSize = useCallback(() => {
    const cacheKeys = queryClient.getQueryCache().getAll()
      .filter(query => query.queryKey[0] === 'agenda' && query.queryKey[1] === 'weekly')
      .sort((a, b) => (b.state.dataUpdatedAt || 0) - (a.state.dataUpdatedAt || 0));

    // Keep only the most recent 10 weeks in cache
    const maxCachedWeeks = 10;
    if (cacheKeys.length > maxCachedWeeks) {
      const keysToRemove = cacheKeys.slice(maxCachedWeeks);
      keysToRemove.forEach(query => {
        queryClient.removeQueries({ queryKey: query.queryKey });
      });
    }
  }, [queryClient]);

  // Background sync for current week
  const backgroundSync = useCallback(() => {
    // Only sync if data is older than 2 minutes
    const currentQuery = queryClient.getQueryState(agendaKeys.weekly(currentWeek));
    const lastUpdate = currentQuery?.dataUpdatedAt || 0;
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

    if (lastUpdate < twoMinutesAgo) {
      queryClient.invalidateQueries({ 
        queryKey: agendaKeys.weekly(currentWeek),
        refetchType: 'none' // Don't trigger loading state
      });
    }
  }, [currentWeek, queryClient]);

  const invalidateWeek = useCallback((weekStart?: Date) => {
    const targetWeek = weekStart || currentWeek;
    queryClient.invalidateQueries({
      queryKey: agendaKeys.weekly(targetWeek)
    });
  }, [currentWeek, queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: agendaKeys.all
    });
  }, [queryClient]);

  // Auto-prefetch adjacent weeks when current week changes
  useEffect(() => {
    const timer = setTimeout(() => {
      prefetchAdjacentWeeks();
      manageCacheSize(); // Clean up old cache entries
    }, 100); // Small delay to avoid blocking the main query

    return () => clearTimeout(timer);
  }, [prefetchAdjacentWeeks, manageCacheSize]);

  // Background sync interval
  useEffect(() => {
    const interval = setInterval(() => {
      backgroundSync();
    }, 60 * 1000); // Every minute

    return () => clearInterval(interval);
  }, [backgroundSync]);

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      // Clean up very old cache entries when component unmounts
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const cacheKeys = queryClient.getQueryCache().getAll()
        .filter(query => 
          query.queryKey[0] === 'agenda' && 
          (query.state.dataUpdatedAt || 0) < oneHourAgo
        );
      
      cacheKeys.forEach(query => {
        queryClient.removeQueries({ queryKey: query.queryKey });
      });
    };
  }, [queryClient]);

  // Real-time subscription setup
  useEffect(() => {
    if (!enableRealtime) return;

    let unsubscribe: (() => void) | undefined;

    const setupRealtimeSubscription = async () => {
      try {
        // Subscribe to appointment changes for the current week
        unsubscribe = AppointmentService.subscribeToAppointments(
          (payload) => {
            console.log('Real-time appointment update:', payload);
            
            // Invalidate current week data
            invalidateWeek();
            
            // If the change affects other weeks, invalidate those too
            if (payload.new?.date || payload.old?.date) {
              const affectedDate = payload.new?.date || payload.old?.date;
              const affectedWeek = getWeekStart(new Date(affectedDate));
              
              if (formatDate(affectedWeek) !== formatDate(currentWeek)) {
                queryClient.invalidateQueries({
                  queryKey: agendaKeys.weekly(affectedWeek)
                });
              }
            }
          },
          {
            date: formatDate(currentWeek)
          }
        );
      } catch (error) {
        console.error('Failed to setup real-time subscription:', error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentWeek, enableRealtime, invalidateWeek, queryClient]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            goToPreviousWeek();
          }
          break;
        case 'ArrowRight':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            goToNextWeek();
          }
          break;
        case 'Home':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            goToToday();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousWeek, goToNextWeek, goToToday]);

  return {
    // Current week data
    currentWeek,
    weeklyData,
    isLoading,
    error,
    
    // Navigation
    goToWeek,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    
    // Filters
    filters,
    setFilters: handleSetFilters,
    clearFilters,
    
    // Utilities
    isCurrentWeek,
    weekRange,
    timeSlots: weeklyData?.timeSlots || [],
    
    // Cache management
    prefetchAdjacentWeeks,
    manageCacheSize,
    backgroundSync,
    invalidateWeek,
    invalidateAll,
  };
}

// Utility hook for agenda context
export function useAgendaContext() {
  // This could be used with a React Context if needed
  // For now, it's just a placeholder for future context integration
  return {
    isAgendaPage: true,
    // Add more context-specific data here
  };
}

// Hook for agenda statistics
export function useAgendaStats(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['agenda', 'stats', dateFrom, dateTo],
    queryFn: () => AppointmentService.getAppointmentStats(dateFrom, dateTo),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!dateFrom && !!dateTo,
  });
}

// Hook for checking time conflicts
export function useTimeConflictCheck() {
  const queryClient = useQueryClient();

  return useCallback(async (
    therapistId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ) => {
    try {
      return await AppointmentService.checkTimeConflict(
        therapistId,
        date,
        startTime,
        endTime,
        excludeId
      );
    } catch (error) {
      console.error('Error checking time conflict:', error);
      return false;
    }
  }, []);
}

// Hook for available time slots
export function useAvailableTimeSlots(
  therapistId: string | undefined,
  date: string | undefined,
  durationMinutes: number = 60
) {
  return useQuery({
    queryKey: ['agenda', 'availableSlots', therapistId, date, durationMinutes],
    queryFn: () => AppointmentService.getAvailableTimeSlots(therapistId!, date!, durationMinutes),
    enabled: !!therapistId && !!date,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}