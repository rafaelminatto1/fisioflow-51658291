/**
 * Hooks para recomendações inteligentes com IA
 * @module hooks/useAIRecommendations
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  generatePatientRecommendations,
  generateBulkPatientRecommendations,
  findOptimalSlots,
  generateTreatmentInsights,
  suggestNextAppointment,
  PatientRecommendation,
  ScheduleRecommendation,
  TreatmentInsight,
} from '@/lib/ai/recommendations';

// =====================================================================
// QUERY KEYS
// =====================================================================

const AI_KEYS = {
  all: ['ai'] as const,
  patientRecommendations: (patientId: string) => [...AI_KEYS.all, 'patient', patientId] as const,
  allRecommendations: () => [...AI_KEYS.all, 'recommendations'] as const,
  scheduleRecommendations: (request: any) => [...AI_KEYS.all, 'schedule', request] as const,
  treatmentInsights: (patientId: string) => [...AI_KEYS.all, 'insights', patientId] as const,
  nextAppointment: (patientId: string) => [...AI_KEYS.all, 'next', patientId] as const,
};

// =====================================================================
// PATIENT RECOMMENDATIONS
// =====================================================================

/**
 * Hook para obter recomendações de um paciente específico
 */
export function usePatientRecommendations(patientId: string) {
  return useQuery({
    queryKey: AI_KEYS.patientRecommendations(patientId),
    queryFn: async (): Promise<PatientRecommendation[]> => {
      // Fetch patient data
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;

      // Fetch appointment history
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('id, date, time, status, therapist_id')
        .eq('patient_id', patientId)
        .order('date', { ascending: false })
        .limit(20);

      if (aptError) throw aptError;

      // Fetch evolution data
      const { data: evolutions, error: evoError } = await supabase
        .from('patient_evolutions')
        .select('id, date, pain_level, evolution_score')
        .eq('patient_id', patientId)
        .order('date', { ascending: false })
        .limit(10);

      if (evoError) throw evoError;

      // Build patient data object
      const patientData = {
        id: patient.id,
        name: patient.full_name,
        lastAppointment: appointments?.find(a => a.status === 'completed')?.date,
        appointmentCount: appointments?.filter(a => a.status === 'completed').length || 0,
        missedAppointments: appointments?.filter(a => a.status === 'no_show' || a.status === 'cancelled').length || 0,
        completedAppointments: appointments?.filter(a => a.status === 'completed').length || 0,
        painLevelHistory: evolutions
          ?.filter(e => e.pain_level !== null)
          .map(e => ({ date: e.date, level: e.pain_level || 0 })) || [],
        evolutionScores: evolutions
          ?.filter(e => e.evolution_score !== null)
          .map(e => ({ date: e.date, score: e.evolution_score || 0 })) || [],
      };

      return generatePatientRecommendations(patientData);
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook para obter recomendações de todos os pacientes
 */
export function useAllPatientRecommendations(options?: {
  status?: 'active' | 'all';
  limit?: number;
}) {
  const { status = 'active', limit = 50 } = options;

  return useQuery({
    queryKey: [...AI_KEYS.allRecommendations(), status, limit],
    queryFn: async (): Promise<PatientRecommendation[]> => {
      // Fetch patients with their appointment and evolution data
      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .limit(limit);

      if (error) throw error;

      // Fetch all relevant data in parallel
      const patientsWithData = await Promise.all(
        patients.map(async (patient) => {
          const [appointmentsResult, evolutionsResult] = await Promise.all([
            supabase
              .from('appointments')
              .select('id, date, time, status, therapist_id')
              .eq('patient_id', patient.id)
              .order('date', { ascending: false })
              .limit(20),
            supabase
              .from('patient_evolutions')
              .select('id, date, pain_level, evolution_score')
              .eq('patient_id', patient.id)
              .order('date', { ascending: false })
              .limit(10),
          ]);

          return {
            id: patient.id,
            name: patient.full_name,
            lastAppointment: appointmentsResult.data?.find(a => a.status === 'completed')?.date,
            appointmentCount: appointmentsResult.data?.filter(a => a.status === 'completed').length || 0,
            missedAppointments: appointmentsResult.data?.filter(a => a.status === 'no_show' || a.status === 'cancelled').length || 0,
            completedAppointments: appointmentsResult.data?.filter(a => a.status === 'completed').length || 0,
            painLevelHistory: evolutionsResult.data
              ?.filter(e => e.pain_level !== null)
              .map(e => ({ date: e.date, level: e.pain_level || 0 })) || [],
            evolutionScores: evolutionsResult.data
              ?.filter(e => e.evolution_score !== null)
              .map(e => ({ date: e.date, score: e.evolution_score || 0 })) || [],
          };
        })
      );

      return generateBulkPatientRecommendations(patientsWithData);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
  });
}

// =====================================================================
// SCHEDULE RECOMMENDATIONS
// =====================================================================

interface ScheduleRecommendationsOptions {
  patientId: string;
  preferredDays?: string[];
  preferredTimes?: string[];
  duration?: number;
  urgency?: 'low' | 'medium' | 'high';
}

/**
 * Hook para obter recomendações de horário para agendamento
 */
export function useScheduleRecommendations(options: ScheduleRecommendationsOptions) {
  return useQuery({
    queryKey: AI_KEYS.scheduleRecommendations(options),
    queryFn: async (): Promise<ScheduleRecommendation[]> => {
      // Fetch patient data
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, full_name, condition')
        .eq('id', options.patientId)
        .single();

      if (patientError) throw patientError;

      // Fetch last therapist
      const { data: lastApt } = await supabase
        .from('appointments')
        .select('therapist_id')
        .eq('patient_id', options.patientId)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      // Fetch therapists
      const { data: therapists } = await supabase
        .from('therapists')
        .select('id, name, specialties')
        .eq('status', 'active');

      // For now, return empty recommendations since we need availability data
      // This would be enhanced with actual availability data from the schedule
      return [];
    },
    enabled: !!options.patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =====================================================================
// TREATMENT INSIGHTS
// =====================================================================

/**
 * Hook para obter insights sobre o tratamento do paciente
 */
export function useTreatmentInsights(patientId: string) {
  return useQuery({
    queryKey: AI_KEYS.treatmentInsights(patientId),
    queryFn: async (): Promise<TreatmentInsight[]> => {
      // Fetch patient data
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, full_name')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;

      // Fetch evolution data
      const { data: evolutions, error: evoError } = await supabase
        .from('patient_evolutions')
        .select('id, date, evolution_score, pain_level')
        .eq('patient_id', patientId)
        .order('date', { ascending: true });

      if (evoError) throw evoError;

      // Fetch active goals
      const { data: goals } = await supabase
        .from('patient_goals')
        .select('id, title, target_value, current_value, deadline')
        .eq('patient_id', patientId)
        .eq('status', 'active');

      const evolutionData = {
        patientId: patient.id,
        patientName: patient.full_name,
        scores: evolutions?.map(e => ({
          date: e.date,
          score: e.evolution_score || 0,
        })) || [],
        goals: goals?.map(g => ({
          id: g.id,
          title: g.title,
          target: g.target_value,
          current: g.current_value,
          deadline: g.deadline,
        })) || [],
      };

      return generateTreatmentInsights(evolutionData);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =====================================================================
// NEXT APPOINTMENT SUGGESTION
// =====================================================================

/**
 * Hook para obter sugestão de próximo agendamento
 */
export function useNextAppointmentSuggestion(patientId: string) {
  return useQuery({
    queryKey: AI_KEYS.nextAppointment(patientId),
    queryFn: async () => {
      // Fetch appointment history
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('date, time, therapist_id, duration, type')
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!appointments || appointments.length === 0) return null;

      return suggestNextAppointment(appointments);
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// =====================================================================
// DISMISS RECOMMENDATION
// =====================================================================

/**
 * Hook para descartar uma recomendação
 */
export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  const dismiss = async (recommendationId: string) => {
    // Store dismissal in localStorage (or could be stored in database)
    const dismissals = JSON.parse(localStorage.getItem('dismissed-recommendations') || '[]');
    dismissals.push({
      id: recommendationId,
      dismissedAt: new Date().toISOString(),
    });
    localStorage.setItem('dismissed-recommendations', JSON.stringify(dismissals));

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: AI_KEYS.allRecommendations() });

    toast({
      title: 'Recomendação descartada',
      description: 'Você não verá esta recomendação novamente.',
    });
  };

  return { dismiss };
}

// =====================================================================
// EXPORTS
// =====================================================================

export default usePatientRecommendations;
