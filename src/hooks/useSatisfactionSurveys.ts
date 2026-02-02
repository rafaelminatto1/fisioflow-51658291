/**
 * useSatisfactionSurveys - Migrated to Firebase
 *
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query as firestoreQuery, where, orderBy,  } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/app';



export interface SatisfactionSurvey {
  id: string;
  organization_id: string;
  patient_id: string;
  appointment_id: string | null;
  therapist_id: string | null;
  nps_score: number | null;
  q_care_quality: number | null;
  q_professionalism: number | null;
  q_facility_cleanliness: number | null;
  q_scheduling_ease: number | null;
  q_communication: number | null;
  comments: string | null;
  suggestions: string | null;
  sent_at: string;
  responded_at: string | null;
  response_time_hours: number | null;
  created_at: string;
  updated_at: string;
  // Relações
  patient?: {
    id: string;
    full_name: string;
  };
  appointment?: {
    id: string;
    start_time: string;
  };
  therapist?: {
    id: string;
    name: string;
  };
}

export interface CreateSurveyData {
  patient_id: string;
  appointment_id?: string;
  therapist_id?: string;
  nps_score: number;
  q_care_quality?: number;
  q_professionalism?: number;
  q_facility_cleanliness?: number;
  q_scheduling_ease?: number;
  q_communication?: number;
  comments?: string;
  suggestions?: string;
}

export interface SurveyFilters {
  patient_id?: string;
  therapist_id?: string;
  start_date?: string;
  end_date?: string;
  responded?: boolean;
}

export function useSatisfactionSurveys(filters?: SurveyFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['satisfaction-surveys', filters],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'satisfaction_surveys'),
        orderBy('sent_at', 'desc')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Apply filters
      if (filters?.patient_id) {
        data = data.filter((item: SatisfactionSurvey) => item.patient_id === filters.patient_id);
      }

      if (filters?.therapist_id) {
        data = data.filter((item: SatisfactionSurvey) => item.therapist_id === filters.therapist_id);
      }

      if (filters?.start_date) {
        data = data.filter((item: SatisfactionSurvey) => item.sent_at >= filters.start_date);
      }

      if (filters?.end_date) {
        data = data.filter((item: SatisfactionSurvey) => item.sent_at <= filters.end_date);
      }

      if (filters?.responded !== undefined) {
        data = data.filter((item: SatisfactionSurvey) => {
          const hasResponded = item.responded_at !== null;
          return filters.responded ? hasResponded : !hasResponded;
        });
      }

      // Fetch patient data
      const patientIds = data.map((item: SatisfactionSurvey) => item.patient_id).filter(Boolean);
      const patientMap = new Map<string, { id: string; full_name: string }>();

      await Promise.all([...new Set(patientIds)].map(async (patientId) => {
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        if (patientDoc.exists()) {
          patientMap.set(patientId, {
            id: patientDoc.id,
            full_name: patientDoc.data().full_name as string,
          });
        }
      }));

      // Fetch appointment data
      const appointmentIds = data.map((item: SatisfactionSurvey) => item.appointment_id).filter((id): id is string => id !== null);
      const appointmentMap = new Map<string, { id: string; start_time: string }>();

      await Promise.all([...new Set(appointmentIds)].map(async (appointmentId) => {
        const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
        if (appointmentDoc.exists()) {
          appointmentMap.set(appointmentId, {
            id: appointmentDoc.id,
            start_time: appointmentDoc.data().start_time as string,
          });
        }
      }));

      // Fetch therapist names from Firestore
      const therapistIds = [...new Set(data.map((item: SatisfactionSurvey) => item.therapist_id).filter((id): id is string => id !== null))];
      const therapistMap = new Map<string, string>();

      if (therapistIds.length > 0) {
        const profilesQ = firestoreQuery(collection(db, 'profiles'), where('user_id', 'in', therapistIds));
        const profilesSnap = await getDocs(profilesQ);
        profilesSnap.forEach(doc => {
          therapistMap.set(doc.data().user_id as string, doc.data().full_name as string);
        });
      }

      // Map data to expected format
      return data.map((item: SatisfactionSurvey) => ({
        ...item,
        patient: patientMap.get(item.patient_id),
        appointment: item.appointment_id ? appointmentMap.get(item.appointment_id) : undefined,
        therapist: item.therapist_id ? {
          id: item.therapist_id,
          name: therapistMap.get(item.therapist_id) || 'Terapeuta'
        } : undefined,
      })) as SatisfactionSurvey[];
    },
  });
}

export function useSurveyStats() {
  return useQuery({
    queryKey: ['survey-stats'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'satisfaction_surveys'));
      const surveys = snapshot.docs.map(doc => doc.data()) as SatisfactionSurvey[];

      const total = surveys.length || 0;
      const respondedSurveys = surveys.filter((s) => s.responded_at !== null);
      const respondedCount = respondedSurveys.length;

      const promotores = respondedSurveys.filter((s) => s.nps_score !== null && s.nps_score >= 9).length;
      const neutros = respondedSurveys.filter((s) => s.nps_score !== null && s.nps_score >= 7 && s.nps_score <= 8).length;
      const detratores = respondedSurveys.filter((s) => s.nps_score !== null && s.nps_score <= 6).length;

      const nps = respondedCount > 0 ? Math.round(((promotores - detratores) / respondedCount) * 100) : 0;

      const avgCareQuality = respondedCount > 0
        ? respondedSurveys.reduce((sum, s) => sum + (s.q_care_quality || 0), 0) / respondedCount
        : 0;

      const avgProfessionalism = respondedCount > 0
        ? respondedSurveys.reduce((sum, s) => sum + (s.q_professionalism || 0), 0) / respondedCount
        : 0;

      const avgCommunication = respondedCount > 0
        ? respondedSurveys.reduce((sum, s) => sum + (s.q_communication || 0), 0) / respondedCount
        : 0;

      const responseRate = total > 0 ? Math.round((respondedCount / total) * 100) : 0;

      return {
        total,
        promotores,
        neutros,
        detratores,
        nps,
        avgCareQuality: Math.round(avgCareQuality * 10) / 10,
        avgProfessionalism: Math.round(avgProfessionalism * 10) / 10,
        avgCommunication: Math.round(avgCommunication * 10) / 10,
        responseRate,
      };
    },
  });
}

export function useCreateSurvey() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSurveyData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;

      if (!profileData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const surveyData = {
        ...data,
        organization_id: profileData.organization_id,
        sent_at: new Date().toISOString(),
        responded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'satisfaction_surveys'), surveyData);
      const docSnap = await getDoc(docRef);

      // Fetch patient data
      const patientDoc = await getDoc(doc(db, 'patients', data.patient_id));
      const patient = patientDoc.exists() ? {
        id: patientDoc.id,
        full_name: patientDoc.data().full_name,
      } : null;

      return {
        id: docRef.id,
        ...docSnap.data(),
        patient,
      } as SatisfactionSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      toast.success('Pesquisa de satisfação registrada');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao registrar pesquisa: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateSurveyData> & { id: string }) => {
      const docRef = doc(db, 'satisfaction_surveys', id);
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      await updateDoc(docRef, updateData);

      const docSnap = await getDoc(docRef);
      return { id, ...docSnap.data() } as SatisfactionSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      toast.success('Pesquisa atualizada');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao atualizar pesquisa: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'satisfaction_surveys', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      toast.success('Pesquisa removida');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao remover pesquisa: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
}
