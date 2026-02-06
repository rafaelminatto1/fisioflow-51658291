/**
 * useTimeTracker - Hook para gerenciamento de Time Tracking com Firestore
 * Gerencia timer ativo, persistência e sync com Firestore
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Timestamp } from '@/integrations/firebase/app';
import { fisioLogger } from '@/lib/errors/logger';
import {

  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  getTimeStats,
  listenToTodayTimeEntries,
  getActiveTimerDraft,
  saveActiveTimerDraft,
  clearActiveTimerDraft,
  finalizeTimer,
} from '@/lib/timetracking/timeTrackingService';

import type {
  ActiveTimer,
  TimeEntry,
  TimeEntryFilters,
  TimeStats,
} from '@/types/timetracking';

// Constants
const STORAGE_KEY = 'fisioflow_active_timer';
const TICK_INTERVAL = 1000; // 1 second

interface UseTimeTrackerOptions {
  organizationId: string;
  userId: string;
  autoSync?: boolean;
}

interface UseTimeTrackerReturn {
  // Estado
  activeTimer: ActiveTimer | null;
  isRunning: boolean;
  currentDuration: number; // segundos
  entries: TimeEntry[];
  isLoading: boolean;
  error: string | null;

  // Ações do Timer
  startTimer: (description: string, options?: TimerOptions) => ActiveTimer;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => void;
  stopTimer: () => Promise<TimeEntry | null>;
  updateActiveTimer: (updates: Partial<ActiveTimer>) => Promise<void>;
  discardTimer: () => void;

  // Ações de Entradas
  loadEntries: (filters?: TimeEntryFilters) => Promise<void>;
  createEntry: (entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>) => Promise<TimeEntry>;
  updateEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  // Utilitários
  getStats: () => Promise<TimeStats>;
  refresh: () => Promise<void>;
}

interface TimerOptions {
  task_id?: string;
  patient_id?: string;
  project_id?: string;
  is_billable?: boolean;
  hourly_rate?: number;
  tags?: string[];
}

export function useTimeTracker(options: UseTimeTrackerOptions): UseTimeTrackerReturn {
  const { organizationId, userId, autoSync = true } = options;

  // Estado
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para timer
  const timerIntervalRef = useRef<number | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ============================================================================
  // Inicialização
  // ============================================================================

  useEffect(() => {
    if (!organizationId || !userId) {
      return;
    }

    // Carregar timer ativo
    loadActiveTimer();

    // Setup listener para entradas de hoje
    unsubscribeRef.current = listenToTodayTimeEntries(
      organizationId,
      userId,
      (todayEntries) => {
        setEntries(todayEntries);
      }
    );

    return () => {
      // Cleanup
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [organizationId, userId, loadActiveTimer]);

  // ============================================================================
  // Timer Tick
  // ============================================================================

  useEffect(() => {
    if (activeTimer) {
      // Start tick interval
      timerIntervalRef.current = window.setInterval(() => {
        // Force re-render para atualizar duração
        setActiveTimer((prev) => prev ? { ...prev } : null);
      }, TICK_INTERVAL);

      // Auto-sync a cada 30 segundos
      if (autoSync) {
        const syncTimeout = setTimeout(() => {
          syncActiveTimer();
        }, 30000);

        return () => clearTimeout(syncTimeout);
      }
    }
  }, [activeTimer, autoSync, syncActiveTimer]);

  // ============================================================================
  // Helpers
  // ============================================================================

  const loadActiveTimer = useCallback(async () => {
    try {
      // Tenta carregar do Firestore primeiro
      const draftTimer = await getActiveTimerDraft(userId);

      if (draftTimer) {
        setActiveTimer(draftTimer);
        // Também salva no localStorage para backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftTimer));
      } else {
        // Fallback para localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const timer: ActiveTimer = JSON.parse(stored);
          const startTime = new Date(timer.start_time);
          const hoursSinceStart = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);

          if (hoursSinceStart < 24) {
            setActiveTimer(timer);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
    } catch (err) {
      fisioLogger.error('Erro ao carregar timer ativo', err as Error, 'useTimeTracker');
    }
  }, [userId]);

  const saveActiveTimer = useCallback(async (timer: ActiveTimer | null) => {
    if (timer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
      await saveActiveTimerDraft(userId, timer);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      await clearActiveTimerDraft(userId);
    }
    setActiveTimer(timer);
  }, [userId]);

  const syncActiveTimer = useCallback(async () => {
    if (!activeTimer) return;

    try {
      await saveActiveTimerDraft(userId, activeTimer);
    } catch (err) {
      fisioLogger.error('Erro ao sync timer ativo', err as Error, 'useTimeTracker');
    }
  }, [activeTimer, userId]);

  const getCurrentDuration = useCallback((): number => {
    if (!activeTimer) return 0;
    const startTime = new Date(activeTimer.start_time);
    return Math.floor((Date.now() - startTime.getTime()) / 1000);
  }, [activeTimer]);

  // ============================================================================
  // Ações do Timer
  // ============================================================================

  const startTimer = useCallback(
    (description: string, options?: TimerOptions): ActiveTimer => {
      const timer: ActiveTimer = {
        id: `timer-${Date.now()}`,
        description,
        start_time: new Date(),
        task_id: options?.task_id,
        patient_id: options?.patient_id,
        project_id: options?.project_id,
        is_billable: options?.is_billable ?? true,
        hourly_rate: options?.hourly_rate,
        tags: options?.tags || [],
      };

      saveActiveTimer(timer);
      setError(null);
      return timer;
    },
    [saveActiveTimer]
  );

  const pauseTimer = useCallback(async () => {
    if (!activeTimer) return;

    const duration = getCurrentDuration();

    try {
      // Criar entrada parcial
      const partialEntry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        organization_id: organizationId,
        description: activeTimer.description + ' (pausado)',
        start_time: Timestamp.fromDate(activeTimer.start_time),
        end_time: Timestamp.now(),
        duration_seconds: duration,
        is_billable: activeTimer.is_billable,
        hourly_rate: activeTimer.hourly_rate,
        total_value: activeTimer.hourly_rate
          ? (duration / 3600) * activeTimer.hourly_rate
          : undefined,
        task_id: activeTimer.task_id,
        patient_id: activeTimer.patient_id,
        project_id: activeTimer.project_id,
        tags: activeTimer.tags,
      };

      // Salvar entrada
      await createTimeEntry(organizationId, partialEntry);

      // Limpar timer
      await saveActiveTimer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao pausar timer');
    }
  }, [activeTimer, getCurrentDuration, userId, organizationId, saveActiveTimer]);

  const resumeTimer = useCallback(() => {
    if (activeTimer) return;

    // Buscar última entrada pausada e criar novo timer
    const lastEntry = entries[entries.length - 1];
    if (lastEntry && lastEntry.description.includes('(pausado)')) {
      const description = lastEntry.description.replace(' (pausado)', '');
      startTimer(description, {
        task_id: lastEntry.task_id,
        patient_id: lastEntry.patient_id,
        project_id: lastEntry.project_id,
        is_billable: lastEntry.is_billable,
        hourly_rate: lastEntry.hourly_rate,
        tags: lastEntry.tags,
      });
    }
  }, [activeTimer, entries, startTimer]);

  const stopTimer = useCallback(async (): Promise<TimeEntry | null> => {
    if (!activeTimer) return null;

    try {
      // Finalizar timer e criar entrada
      const timeEntry = await finalizeTimer(organizationId, userId, activeTimer);

      // Limpar estado local
      await saveActiveTimer(null);

      return timeEntry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao parar timer');
      return null;
    }
  }, [activeTimer, organizationId, userId, saveActiveTimer]);

  const discardTimer = useCallback(async () => {
    await saveActiveTimer(null);
  }, [saveActiveTimer]);

  const updateActiveTimer = useCallback(async (updates: Partial<ActiveTimer>) => {
    if (!activeTimer) return;
    const updatedTimer = { ...activeTimer, ...updates };
    await saveActiveTimer(updatedTimer);
  }, [activeTimer, saveActiveTimer]);

  // ============================================================================
  // Ações de Entradas
  // ============================================================================

  const loadEntries = useCallback(async (filters?: TimeEntryFilters) => {
    if (!organizationId) {
      setEntries([]);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const loadedEntries = await getTimeEntries(organizationId, filters);
      setEntries(loadedEntries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar entradas';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  const createEntry = useCallback(async (
    data: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TimeEntry> => {
    if (!organizationId) {
      throw new Error('Organização não definida');
    }
    setError(null);

    try {
      const entry = await createTimeEntry(organizationId, data);
      setEntries((prev) => [entry, ...prev]);
      return entry;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar entrada';
      setError(message);
      throw err;
    }
  }, [organizationId]);

  const updateEntry = useCallback(async (id: string, updates: Partial<TimeEntry>) => {
    if (!organizationId) return;
    setError(null);

    try {
      await updateTimeEntry(organizationId, id, updates);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates, updated_at: Timestamp.now() } : e))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar entrada';
      setError(message);
      throw err;
    }
  }, [organizationId]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!organizationId) return;
    setError(null);

    try {
      await deleteTimeEntry(organizationId, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar entrada';
      setError(message);
      throw err;
    }
  }, [organizationId]);

  // ============================================================================
  // Utilitários
  // ============================================================================

  const getStats = useCallback(async (): Promise<TimeStats> => {
    if (!organizationId) {
      return {
        today: { total_seconds: 0, billable_seconds: 0, entries: 0 },
        this_week: { total_seconds: 0, billable_seconds: 0, entries: 0 },
        this_month: { total_seconds: 0, billable_seconds: 0, entries: 0 },
        average_daily: 0,
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Domingo

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayStats, weekStats, monthStats] = await Promise.all([
      getTimeStats(organizationId, userId, today, new Date()),
      getTimeStats(organizationId, userId, weekStart, new Date()),
      getTimeStats(organizationId, userId, monthStart, new Date()),
    ]);

    const daysElapsed = today.getDate();
    const averageDaily = monthStats.total_seconds / daysElapsed;

    return {
      today: {
        total_seconds: todayStats.total_seconds,
        billable_seconds: todayStats.billable_seconds,
        entries: todayStats.entries_count,
      },
      this_week: {
        total_seconds: weekStats.total_seconds,
        billable_seconds: weekStats.billable_seconds,
        entries: weekStats.entries_count,
      },
      this_month: {
        total_seconds: monthStats.total_seconds,
        billable_seconds: monthStats.billable_seconds,
        entries: monthStats.entries_count,
      },
      average_daily: Math.round(averageDaily),
    };
  }, [organizationId, userId]);

  const refresh = useCallback(async () => {
    await loadEntries();
  }, [loadEntries]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Estado
    activeTimer,
    isRunning: !!activeTimer,
    currentDuration: getCurrentDuration(),
    entries,
    isLoading,
    error,

    // Ações do Timer
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    updateActiveTimer,
    discardTimer,

    // Ações de Entradas
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,

    // Utilitários
    getStats,
    refresh,
  };
}

/**
 * Hook simplificado para widget de timer rápido
 */
export function useQuickTimer(options: { organizationId: string; userId: string }) {
  const { activeTimer, isRunning, currentDuration, startTimer, stopTimer, updateActiveTimer, discardTimer } =
    useTimeTracker(options);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    activeTimer,
    isRunning,
    formattedTime: formatTime(currentDuration),
    startTimer: (description: string) => startTimer(description),
    stopTimer,
    updateActiveTimer,
    discardTimer,
  };
}
