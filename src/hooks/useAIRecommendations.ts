/**
 * Hooks para recomendações inteligentes com IA - Migrated to Firebase
 * @module hooks/useAIRecommendations
 *
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, query as firestoreQuery, where, orderBy, limit as queryLimit, db } from '@/integrations/firebase/app';
import { toast } from '@/hooks/use-toast';

  generatePatientRecommendations,
  generateBulkPatientRecommendations,
  findOptimalSlots,
  generateTreatmentInsights,
  suggestNextAppointment,
  PatientRecommendation,
  ScheduleRecommendation,
  TreatmentInsight,
} from '@/lib/ai/recommendations';


// ============================================================================
// TYPES
// ============================================================================

interface Appointment {
  id: string;
  patient_id?: string;
  date?: string;
  status?: string;
  [key: string]: unknown;
}

interface Evolution {
  id: string;
  patient_id?: string;
  date?: string;
  pain_level?: number | null;
  evolution_score?: number | null;
  [key: string]: unknown;
}

interface Patient {
  id: string;
  full_name?: string;
  [key: string]: unknown;
}

interface Goal {
  id: string;
  title?: string;
  target_date?: string;
  status?: string;
  [key: string]: unknown;
}

// =====================================================================
// QUERY KEYS
// =====================================================================

const AI_KEYS = {
  all: ['ai'] as const,
  patientRecommendations: (patientId: string) => [...AI_KEYS.all, 'patient', patientId] as const,
  allRecommendations: () => [...AI_KEYS.all, 'recommendations'] as const,
  scheduleRecommendations: (request: ScheduleRecommendation) => [...AI_KEYS.all, 'schedule', request] as const,
  treatmentInsights: (patientId: string) => [...AI_KEYS.all, 'insights', patientId] as const,
  nextAppointment: (patientId: string) => [...AI_KEYS.all, 'next', patientId] as const,
};

// Helper to convert doc to data
const convertDoc = <T extends Record<string, unknown>>(doc: { id: string; data: () => T }): T & { id: string } => {
  return { id: doc.id, ...doc.data() };
};

// =====================================================================
// PATIENT RECOMMENDATIONS
// =====================================================================

export function usePatientRecommendations(patientId: string) {
  return useQuery({
    queryKey: AI_KEYS.patientRecommendations(patientId),
    queryFn: async (): Promise<PatientRecommendation[]> => {
      // Fetch patient data
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      if (!patientDoc.exists()) throw new Error('Patient not found');
      const patient = convertDoc(patientDoc);

      // Fetch appointment history
      const appointmentsQuery = firestoreQuery(
        collection(db, 'appointments'),
        where('patient_id', '==', patientId),
        orderBy('date', 'desc'),
        queryLimit(20)
      );
      const appointmentsSnap = await getDocs(appointmentsQuery);
      const appointments = appointmentsSnap.docs.map(convertDoc);

      // Fetch evolution data
      const evolutionsQuery = firestoreQuery(
        collection(db, 'patient_evolutions'),
        where('patient_id', '==', patientId),
        orderBy('date', 'desc'),
        queryLimit(10)
      );
      const evolutionsSnap = await getDocs(evolutionsQuery);
      const evolutions = evolutionsSnap.docs.map(convertDoc);

      // Build patient data object
      const patientData = {
        id: patient.id,
        name: patient.full_name,
        lastAppointment: appointments?.find((a) => a.status === 'completed')?.date,
        appointmentCount: appointments?.filter((a) => a.status === 'completed').length || 0,
        missedAppointments: appointments?.filter((a) => a.status === 'no_show' || a.status === 'cancelled').length || 0,
        completedAppointments: appointments?.filter((a) => a.status === 'completed').length || 0,
        painLevelHistory: evolutions
          ?.filter((e) => e.pain_level !== null)
          .map((e) => ({ date: e.date || '', level: e.pain_level || 0 })) || [],
        evolutionScores: evolutions
          ?.filter((e) => e.evolution_score !== null)
          .map((e) => ({ date: e.date || '', score: e.evolution_score || 0 })) || [],
      };

      return generatePatientRecommendations(patientData);
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useAllPatientRecommendations(options?: {
  status?: 'active' | 'all';
  limit?: number;
}) {
  const { status = 'active', limit = 50 } = options;

  return useQuery({
    queryKey: [...AI_KEYS.allRecommendations(), status, limit],
    queryFn: async (): Promise<PatientRecommendation[]> => {
      // Fetch patients with their appointment and evolution data
      const patientsQuery = firestoreQuery(
        collection(db, 'patients'),
        queryLimit(limit)
      );
      const patientsSnap = await getDocs(patientsQuery);
      const patients = patientsSnap.docs.map(convertDoc);

      // Fetch all relevant data in parallel
      const patientsWithData = await Promise.all(
        patients.map(async (patient: Patient) => {
          const [appointmentsSnap, evolutionsSnap] = await Promise.all([
            getDocs(firestoreQuery(
              collection(db, 'appointments'),
              where('patient_id', '==', patient.id),
              orderBy('date', 'desc'),
              queryLimit(20)
            )),
            getDocs(firestoreQuery(
              collection(db, 'patient_evolutions'),
              where('patient_id', '==', patient.id),
              orderBy('date', 'desc'),
              queryLimit(10)
            )),
          ]);

          const appointments = appointmentsSnap.docs.map(convertDoc);
          const evolutions = evolutionsSnap.docs.map(convertDoc);

          return {
            id: patient.id,
            name: patient.full_name,
            lastAppointment: appointments?.find((a: Appointment) => a.status === 'completed')?.date,
            appointmentCount: appointments?.filter((a: Appointment) => a.status === 'completed').length || 0,
            missedAppointments: appointments?.filter((a: Appointment) => a.status === 'no_show' || a.status === 'cancelled').length || 0,
            completedAppointments: appointments?.filter((a: Appointment) => a.status === 'completed').length || 0,
            painLevelHistory: evolutions
              ?.filter((e: Evolution) => e.pain_level !== null)
              .map((e: Evolution) => ({ date: e.date || '', level: e.pain_level || 0 })) || [],
            evolutionScores: evolutions
              ?.filter((e: Evolution) => e.evolution_score !== null)
              .map((e: Evolution) => ({ date: e.date || '', score: e.evolution_score || 0 })) || [],
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

export function useScheduleRecommendations(options: ScheduleRecommendationsOptions) {
  return useQuery({
    queryKey: AI_KEYS.scheduleRecommendations(options),
    queryFn: async (): Promise<ScheduleRecommendation[]> => {
      // Fetch patient data
      const patientDoc = await getDoc(doc(db, 'patients', options.patientId));
      if (!patientDoc.exists()) throw new Error('Patient not found');
      const patient = convertDoc(patientDoc);

      // Fetch last therapist
      const lastAptQuery = firestoreQuery(
        collection(db, 'appointments'),
        where('patient_id', '==', options.patientId),
        where('status', '==', 'atendido'),
        orderBy('date', 'desc'),
        queryLimit(1)
      );
      const lastAptSnap = await getDocs(lastAptQuery);
      const lastApt = lastAptSnap.docs.map(convertDoc)[0];

      // Fetch therapists
      const therapistsQuery = firestoreQuery(
        collection(db, 'therapists'),
        where('status', '==', 'active')
      );
      const therapistsSnap = await getDocs(therapistsQuery);
      const therapists = therapistsSnap.docs.map(convertDoc);

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

export function useTreatmentInsights(patientId: string) {
  return useQuery({
    queryKey: AI_KEYS.treatmentInsights(patientId),
    queryFn: async (): Promise<TreatmentInsight[]> => {
      // Fetch patient data
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      if (!patientDoc.exists()) throw new Error('Patient not found');
      const patient = convertDoc(patientDoc);

      // Fetch evolution data
      const evolutionsQuery = firestoreQuery(
        collection(db, 'patient_evolutions'),
        where('patient_id', '==', patientId),
        orderBy('date', 'asc')
      );
      const evolutionsSnap = await getDocs(evolutionsQuery);
      const evolutions = evolutionsSnap.docs.map(convertDoc);

      // Fetch active goals
      const goalsQuery = firestoreQuery(
        collection(db, 'patient_goals'),
        where('patient_id', '==', patientId),
        where('status', '==', 'active')
      );
      const goalsSnap = await getDocs(goalsQuery);
      const goals = goalsSnap.docs.map(convertDoc);

      const evolutionData = {
        patientId: patient.id,
        patientName: patient.full_name,
        scores: evolutions?.map((e: Evolution) => ({
          date: e.date || '',
          score: e.evolution_score || 0,
        })) || [],
        goals: goals?.map((g: Goal) => ({
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

export function useNextAppointmentSuggestion(patientId: string) {
  return useQuery({
    queryKey: AI_KEYS.nextAppointment(patientId),
    queryFn: async () => {
      // Fetch appointment history
      const appointmentsQuery = firestoreQuery(
        collection(db, 'appointments'),
        where('patient_id', '==', patientId),
        where('status', '==', 'atendido'),
        orderBy('date', 'desc'),
        queryLimit(10)
      );
      const appointmentsSnap = await getDocs(appointmentsQuery);
      const appointments = appointmentsSnap.docs.map(convertDoc);

      if (!appointments || appointments.length === 0) return null;

      return suggestNextAppointment(appointments);
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// =====================================================================
// DISMISS RECOMMENDATION
// =====================================================================

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
