/**
 * Hooks inteligentes para gerenciamento de lista de espera
 * @module hooks/useSmartWaitlist
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { useWaitlist, WaitlistEntry } from './useWaitlist';
import {
  generateAvailableSlots,
  generateWaitlistRecommendations,
  findBestSlotForPatient,
  generateWaitlistAnalytics,
  detectWaitlistAnomalies,
  optimizeSlotAllocation,
  TimeSlot,
  SlotCandidate,
  WaitlistRecommendation,
  WaitlistAnalytics,
} from '@/lib/waitlist/smart-waitlist';

// =====================================================================
// HOOK: SMART WAITLIST RECOMMENDATIONS
// =====================================================================

interface UseSmartWaitlistOptions {
  /** Número de dias à frente para buscar vagas */
  daysAhead?: number;
  /** Candidatos por slot */
  candidatesPerSlot?: number;
}

/**
 * Hook para obter recomendações inteligentes de vagas
 */
export function useSmartWaitlist(options: UseSmartWaitlistOptions = {}) {
  const { daysAhead = 14, candidatesPerSlot = 3 } = options;
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(),
    end: addDays(new Date(), daysAhead),
  });

  const { data: waitlist = [], isLoading: isLoadingWaitlist } = useWaitlist({ status: 'waiting' });

  const recommendationsQuery = useQuery({
    queryKey: ['smart-waitlist', 'recommendations', selectedDateRange, waitlist],
    queryFn: async (): Promise<WaitlistRecommendation[]> => {
      // Fetch blocked dates and times from database
      const { supabase } = await import('@/integrations/supabase/client');

      // Get blocked dates
      const { data: blockedDatesData } = await supabase
        .from('blocked_dates')
        .select('date')
        .gte('date', format(selectedDateRange.start, 'yyyy-MM-dd'))
        .lte('date', format(selectedDateRange.end, 'yyyy-MM-dd'));

      const blockedDates = blockedDatesData?.map(d => parseISO(d.date)) || [];

      // Get blocked time slots
      const { data: blockedSlotsData } = await supabase
        .from('blocked_time_slots')
        .select('date, time')
        .gte('date', format(selectedDateRange.start, 'yyyy-MM-dd'))
        .lte('date', format(selectedDateRange.end, 'yyyy-MM-dd'));

      const blockedTimes: Record<string, string[]> = {};
      blockedSlotsData?.forEach(slot => {
        if (!blockedTimes[slot.date]) {
          blockedTimes[slot.date] = [];
        }
        blockedTimes[slot.date].push(slot.time);
      });

      const availableSlots = generateAvailableSlots(
        selectedDateRange.start,
        daysAhead,
        blockedDates,
        blockedTimes
      );

      return generateWaitlistRecommendations(waitlist, availableSlots, candidatesPerSlot);
    },
    enabled: waitlist.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    recommendations: recommendationsQuery.data || [],
    isLoading: isLoadingWaitlist || recommendationsQuery.isLoading,
    error: recommendationsQuery.error,
    setDateRange: setSelectedDateRange,
  };
}

// =====================================================================
// HOOK: BEST SLOT FOR PATIENT
// =====================================================================

/**
 * Hook para encontrar a melhor vaga para um paciente específico
 */
export function useBestSlotForPatient(entry: WaitlistEntry | null) {
  const [scheduledAppointments, setScheduledAppointments] = useState<Array<{
    date: string;
    time: string;
    duration?: number;
  }>>([]);

  const bestSlotQuery = useQuery({
    queryKey: ['best-slot', entry?.id, scheduledAppointments],
    queryFn: async (): Promise<TimeSlot | null> => {
      if (!entry) return null;

      // Fetch blocked dates and times from database
      const { supabase } = await import('@/integrations/supabase/client');
      const endDate = addDays(new Date(), 30);

      // Get blocked dates
      const { data: blockedDatesData } = await supabase
        .from('blocked_dates')
        .select('date')
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      const blockedDates = blockedDatesData?.map(d => parseISO(d.date)) || [];

      // Get blocked time slots
      const { data: blockedSlotsData } = await supabase
        .from('blocked_time_slots')
        .select('date, time')
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      const blockedTimes: Record<string, string[]> = {};
      blockedSlotsData?.forEach(slot => {
        if (!blockedTimes[slot.date]) {
          blockedTimes[slot.date] = [];
        }
        blockedTimes[slot.date].push(slot.time);
      });

      const availableSlots = generateAvailableSlots(
        new Date(),
        30, // Look 30 days ahead
        blockedDates,
        blockedTimes
      );

      return findBestSlotForPatient(entry, availableSlots, scheduledAppointments);
    },
    enabled: !!entry,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    bestSlot: bestSlotQuery.data,
    isLoading: bestSlotQuery.isLoading,
    error: bestSlotQuery.error,
    setScheduledAppointments,
  };
}

// =====================================================================
// HOOK: WAITLIST ANALYTICS
// =====================================================================

/**
 * Hook para obter analytics da lista de espera
 */
export function useWaitlistAnalytics() {
  const { data: waitlist = [] } = useWaitlist();

  return useQuery({
    queryKey: ['waitlist-analytics', waitlist],
    queryFn: async (): Promise<WaitlistAnalytics> => {
      return generateWaitlistAnalytics(waitlist);
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// =====================================================================
// HOOK: WAITLIST ANOMALIES
// =====================================================================

/**
 * Hook para detectar anomalias na lista de espera
 */
export function useWaitlistAnomalies() {
  const { data: waitlist = [] } = useWaitlist();

  return useQuery({
    queryKey: ['waitlist-anomalies', waitlist],
    queryFn: async (): Promise<string[]> => {
      return detectWaitlistAnomalies(waitlist);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// =====================================================================
// HOOK: AUTO OFFER SLOTS
// =====================================================================

/**
 * Hook para oferecer vagas automaticamente para candidatos via WhatsApp
 */
export function useAutoOfferSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recommendation,
      maxCandidates = 1,
    }: {
      recommendation: WaitlistRecommendation;
      maxCandidates?: number;
    }) => {
      const { WhatsAppService } = await import('@/lib/services/WhatsAppService');
      const { supabase } = await import('@/integrations/supabase/client');
      const results = [];

      for (let i = 0; i < Math.min(recommendation.candidates.length, maxCandidates); i++) {
        const candidate = recommendation.candidates[i];
        const slot = recommendation.slot;
        const entry = candidate.entry;

        // Get patient phone from entry
        const patientPhone = entry.patient?.phone;
        const patientName = entry.patient?.name || 'Paciente';

        if (!patientPhone) {
          results.push({
            candidate,
            slot,
            success: false,
            error: 'Paciente sem telefone cadastrado',
          });
          continue;
        }

        // Update waitlist entry status to 'offered'
        await supabase
          .from('waitlist')
          .update({
            status: 'offered',
            offered_slot: `${slot.dateString} ${slot.time}`,
            offered_at: new Date().toISOString(),
            offer_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', entry.id);

        // Send WhatsApp offer
        const sendResult = await WhatsAppService.sendSlotOffer({
          patientName,
          patientPhone,
          patientId: entry.patient_id,
          waitlistEntryId: entry.id,
          slotDate: slot.date,
          slotTime: slot.time,
          expiresInHours: 24,
        });

        results.push({
          candidate,
          slot,
          offeredAt: new Date().toISOString(),
          success: sendResult.success,
          messageId: sendResult.messageId,
          error: sendResult.error,
        });
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['smart-waitlist'] });

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        // Toast is handled by toast from sonner - import at top if needed
        console.log(`[useAutoOfferSlots] ${successCount} ofertas enviadas com sucesso`);
      }
      if (failCount > 0) {
        console.warn(`[useAutoOfferSlots] ${failCount} ofertas falharam`);
      }
    },
  });
}

// =====================================================================
// HOOK: OPTIMIZE ALLOCATIONS
// =====================================================================

/**
 * Hook para otimizar distribuição de vagas
 */
export function useOptimizeAllocations() {
  const [startDate] = useState(() => new Date());
  const [daysAhead] = useState(14);

  const { data: waitlist = [] } = useWaitlist({ status: 'waiting' });

  return useQuery({
    queryKey: ['waitlist-optimization', waitlist, startDate, daysAhead],
    queryFn: async (): Promise<Map<string, TimeSlot>> => {
      // Fetch blocked dates and times from database
      const { supabase } = await import('@/integrations/supabase/client');
      const endDate = addDays(startDate, daysAhead);

      // Get blocked dates
      const { data: blockedDatesData } = await supabase
        .from('blocked_dates')
        .select('date')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      const blockedDates = blockedDatesData?.map(d => parseISO(d.date)) || [];

      // Get blocked time slots
      const { data: blockedSlotsData } = await supabase
        .from('blocked_time_slots')
        .select('date, time')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      const blockedTimes: Record<string, string[]> = {};
      blockedSlotsData?.forEach(slot => {
        if (!blockedTimes[slot.date]) {
          blockedTimes[slot.date] = [];
        }
        blockedTimes[slot.date].push(slot.time);
      });

      const availableSlots = generateAvailableSlots(
        startDate,
        daysAhead,
        blockedDates,
        blockedTimes
      );

      return optimizeSlotAllocation(waitlist, availableSlots);
    },
    enabled: waitlist.length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// =====================================================================
// HOOK: SMART WAITLIST MANAGER
// =====================================================================

interface SmartWaitlistManagerOptions {
  daysAhead?: number;
  candidatesPerSlot?: number;
}

/**
 * Hook principal que combina todas as funcionalidades inteligentes
 */
export function useSmartWaitlistManager(options: SmartWaitlistManagerOptions = {}) {
  const { daysAhead = 14, candidatesPerSlot = 3 } = options;

  // Waitlist data
  const { data: waitlist = [], isLoading: isLoadingWaitlist, refetch } = useWaitlist({ status: 'waiting' });

  // Recommendations
  const { recommendations, isLoading: isLoadingRecommendations, setDateRange } = useSmartWaitlist({
    daysAhead,
    candidatesPerSlot,
  });

  // Analytics
  const { data: analytics, isLoading: isLoadingAnalytics } = useWaitlistAnalytics();

  // Anomalies
  const { data: anomalies = [], isLoading: isLoadingAnomalies } = useWaitlistAnomalies();

  // Optimized allocations
  const { data: allocations, isLoading: isLoadingAllocations } = useOptimizeAllocations();

  // Auto offer
  const autoOffer = useAutoOfferSlots();

  // Computed values
  const urgentCount = waitlist.filter(e => e.priority === 'urgent').length;
  const highPriorityCount = waitlist.filter(e => e.priority === 'high').length;
  const normalCount = waitlist.filter(e => e.priority === 'normal').length;

  const isLoading = isLoadingWaitlist || isLoadingRecommendations || isLoadingAnalytics ||
    isLoadingAnomalies || isLoadingAllocations;

  // Helpers
  const getRecommendationForDate = useCallback((date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return recommendations.find(r => r.slot.dateString === dateString);
  }, [recommendations]);

  const getCandidatesForDate = useCallback((date: Date): SlotCandidate[] => {
    return getRecommendationForDate(date)?.candidates || [];
  }, [getRecommendationForDate]);

  return {
    // Data
    waitlist,
    recommendations,
    analytics,
    anomalies,
    allocations,

    // Stats
    urgentCount,
    highPriorityCount,
    normalCount,

    // State
    isLoading,

    // Actions
    setDateRange,
    refetch,
    autoOffer: autoOffer.mutateAsync,
    isAutoOffering: autoOffer.isPending,

    // Helpers
    getRecommendationForDate,
    getCandidatesForDate,
  };
}

// =====================================================================
// EXPORTS
// =====================================================================

export default useSmartWaitlistManager;
