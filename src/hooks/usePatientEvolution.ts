/**
 * usePatientEvolution - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, limit, db } from '@/integrations/firebase/app';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppointmentData } from '@/hooks/useAppointmentData';
import { useCreateSoapRecord, useSoapRecords } from '@/hooks/useSoapRecords';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { useGamification } from '@/hooks/useGamification';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { getAuth } from 'firebase/auth';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { getErrorMessage } from '@/types';

const auth = getAuth();

// Types
import { Surgery, MedicalReturn, PatientGoal, Pathology } from '@/types/evolution';

// Re-using types from @/types/evolution

export interface PathologyRequiredMeasurement {
  id: string;
  pathology_name: string;
  measurement_name: string;
  measurement_unit?: string;
  alert_level: 'high' | 'medium' | 'low';
  instructions?: string;
}

/**
 * Medição de evolução do paciente.
 * Para testes com múltiplos valores (ex.: Y Balance: anterior, posteromedial, posterolateral),
 * os valores individuais ficam em custom_data e value é um composto (ex.: média) para gráficos.
 */
export interface EvolutionMeasurement {
  id: string;
  soap_record_id?: string;
  patient_id: string;
  measurement_type: string;
  measurement_name: string;
  value: number;
  unit?: string;
  notes?: string;
  custom_data?: Record<string, unknown>;
  measured_at: string;
  created_by: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id?: string;
  therapist_id?: string;
  date?: string;
  time?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Patient {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface SoapRecord {
  id: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface UseEvolutionMeasurementsOptions {
  /**
   * Limit the number of measurements fetched. Helps speed up pages that only
   * need the most recent records (e.g., evolution page initial load).
   */
  limit?: number;
  /**
   * Allow callers to defer the request (React Query `enabled`).
   */
  enabled?: boolean;
}

// Helper para obter usuário atual
const getCurrentUser = () => {
  return auth.currentUser;
};

// Hook para cirurgias
export const usePatientSurgeries = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-surgeries', patientId],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'patient_surgeries'),
        where('patient_id', '==', patientId),
        orderBy('surgery_date', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as Surgery[];
    },
    enabled: !!patientId,
    // OTIMIZAÇÃO: Aumentado staleTime para reduzir requisições
    staleTime: 1000 * 60 * 15, // 15 minutos - dados secundários mudam pouco
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
};

// Hook para retornos médicos
export const usePatientMedicalReturns = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-medical-returns', patientId],
    queryFn: async () => {
      const mapSnapshot = (snapshot: Awaited<ReturnType<typeof getDocs>>) =>
        snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as MedicalReturn[];

      const sortByReturnDateDesc = (returns: MedicalReturn[]) =>
        returns.sort(
          (a, b) => new Date(b.return_date).getTime() - new Date(a.return_date).getTime()
        );

      try {
        const q = firestoreQuery(
          collection(db, 'patient_medical_returns'),
          where('patient_id', '==', patientId),
          orderBy('return_date', 'desc')
        );

        const snapshot = await getDocs(q);
        return mapSnapshot(snapshot);
      } catch (error) {
        const maybeCode = (error as { code?: string })?.code;

        // Fallback para evitar travamento quando o índice composto ainda não existe.
        if (maybeCode === 'failed-precondition') {
          logger.warn(
            'Missing Firestore index for patient_medical_returns. Falling back to client-side sort.',
            { patientId },
            'usePatientEvolution'
          );

          const fallbackQuery = firestoreQuery(
            collection(db, 'patient_medical_returns'),
            where('patient_id', '==', patientId)
          );
          const snapshot = await getDocs(fallbackQuery);
          return sortByReturnDateDesc(mapSnapshot(snapshot));
        }

        throw error;
      }
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: false,
  });
};

// Hook para objetivos
export const usePatientGoals = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-goals', patientId],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'patient_goals'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as PatientGoal[];
    },
    enabled: !!patientId,
    // OTIMIZAÇÃO: Aumentado staleTime - objetivos mudam pouco durante uma sessão
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
};

// Hook para patologias
export const usePatientPathologies = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-pathologies', patientId],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'patient_pathologies'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as Pathology[];
    },
    enabled: !!patientId,
    // OTIMIZAÇÃO: Aumentado staleTime - patologias mudam muito raramente
    staleTime: 1000 * 60 * 20, // 20 minutos
    gcTime: 1000 * 60 * 45, // 45 minutos
  });
};

// Hook para medições obrigatórias baseadas nas patologias
export const useRequiredMeasurements = (pathologyNames: string[]) => {
  const uniquePathologies = useMemo(
    () => Array.from(new Set(pathologyNames.filter(Boolean))),
    [pathologyNames]
  );

  return useQuery({
    queryKey: ['required-measurements', uniquePathologies],
    queryFn: async () => {
      // Executa queries em paralelo para reduzir latência total
      const snapshots = await Promise.all(
        uniquePathologies.map((name) => {
          const q = firestoreQuery(
            collection(db, 'pathology_required_measurements'),
            where('pathology_name', '==', name)
          );
          return getDocs(q);
        })
      );

      const allResults = snapshots.flatMap((snapshot) =>
        snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) } as PathologyRequiredMeasurement))
      );

      // Remove duplicatas (mesma patologia + medição) para evitar renders extras
      const deduped: PathologyRequiredMeasurement[] = [];
      const seen = new Set<string>();

      for (const measurement of allResults) {
        const key = `${measurement.pathology_name}|${measurement.measurement_name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(measurement);
      }

      return deduped;
    },
    enabled: uniquePathologies.length > 0,
    // OTIMIZAÇÃO: Cache maior pois medições obrigatórias mudam raramente
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60, // 1 hora (garbage collection)
  });
};

// Hook para medições de evolução
export const useEvolutionMeasurements = (
  patientId: string,
  options: UseEvolutionMeasurementsOptions = {}
) => {
  const { limit: resultsLimit, enabled = true } = options;

  return useQuery({
    queryKey: ['evolution-measurements', patientId, resultsLimit ?? 'all'],
    queryFn: async () => {
      const baseQuery = [
        collection(db, 'evolution_measurements'),
        where('patient_id', '==', patientId),
        orderBy('measured_at', 'desc'),
      ] as const;

      const q = resultsLimit
        ? firestoreQuery(...baseQuery, limit(resultsLimit))
        : firestoreQuery(...baseQuery);

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as EvolutionMeasurement[];
    },
    enabled: !!patientId && enabled,
    // OTIMIZAÇÃO: Cache mais curto para medições pois podem ser adicionadas durante a sessão
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
  });
};

// Hook para criar medição
export const useCreateMeasurement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (measurement: Omit<EvolutionMeasurement, 'id' | 'created_at'>) => {
      const user = getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const docRef = await addDoc(collection(db, 'evolution_measurements'), {
        ...measurement,
        created_by: user.uid,
        created_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return { id: docSnap.id, ...(docSnap.data() as EvolutionMeasurement) };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evolution-measurements', (data as EvolutionMeasurement).patient_id] });
      toast({
        title: 'Medição registrada',
        description: 'A medição foi registrada com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao registrar medição',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

// Hook para atualizar objetivo
export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: Partial<PatientGoal> }) => {
      const docRef = doc(db, 'patient_goals', goalId);
      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return { id: docSnap.id, ...(docSnap.data() as PatientGoal) } as PatientGoal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals', data.patient_id] });
      toast({ title: 'Objetivo atualizado com sucesso' });
    }
  });
};

// Hook para completar objetivo
export const useCompleteGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const docRef = doc(db, 'patient_goals', goalId);
      const updateData = {
        status: 'concluido',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await updateDoc(docRef, updateData);

      const docSnap = await getDoc(docRef);
      return { id: docSnap.id, ...(docSnap.data() as PatientGoal) } as PatientGoal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals', data.patient_id] });
      toast({ title: '🎉 Objetivo concluído!' });
    }
  });
};

// Hook para criar objetivo
export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goal: Omit<PatientGoal, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'status'> & { status?: PatientGoal['status'] }) => {
      const user = getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const docRef = await addDoc(collection(db, 'patient_goals'), {
        ...goal,
        status: goal.status || 'em_andamento',
        created_by: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return { id: docSnap.id, ...(docSnap.data() as PatientGoal) };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals', (data as PatientGoal).patient_id] });
      toast({
        title: 'Objetivo criado',
        description: 'O objetivo foi criado com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar objetivo',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

// Hook para atualizar status do objetivo
export const useUpdateGoalStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ goalId, status }: { goalId: string; status: 'em_andamento' | 'concluido' | 'cancelado' }) => {
      const docRef = doc(db, 'patient_goals', goalId);
      const updates: Record<string, string | boolean | undefined> = {
        status,
        updated_at: new Date().toISOString(),
        completed_at: status === 'concluido' ? new Date().toISOString() : undefined,
      };

      await updateDoc(docRef, updates);

      const docSnap = await getDoc(docRef);
      return { id: docSnap.id, ...docSnap.data() };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals', (data as PatientGoal).patient_id] });
      toast({
        title: 'Objetivo atualizado',
        description: 'O status do objetivo foi atualizado.'
      });
    }
  });
};

// Hook para excluir objetivo
export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const docRef = doc(db, 'patient_goals', goalId);
      await deleteDoc(docRef);
      return goalId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals'] });
      toast({ title: 'Objetivo excluído com sucesso' });
    }
  });
};

// Consolidated hook for patient evolution page
// This hook combines all the logic needed for the PatientEvolution page
export interface PatientEvolutionData {
  appointment: Appointment | null;
  patient: Patient | null;
  patientId: string | null;
  surgeries: Surgery[];
  medicalReturns: MedicalReturn[];
  goals: PatientGoal[];
  pathologies: Pathology[];
  measurements: EvolutionMeasurement[];
  previousEvolutions: SoapRecord[];
  evolutionStats: {
    totalEvolutions: number;
    completedGoals: number;
    totalGoals: number;
    activePathologiesCount: number;
    totalMeasurements: number;
    avgGoalProgress: number;
    completionRate: number;
  };
}

export function usePatientEvolutionData() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();

  // Data fetching
  const {
    appointment,
    patient,
    patientId,
    isLoading: dataLoading,
    appointmentError,
    patientError
  } = useAppointmentData(appointmentId);

  const { data: surgeries = [] } = usePatientSurgeries(patientId || '');
  const { data: medicalReturns = [] } = usePatientMedicalReturns(patientId || '');
  const { data: goals = [] } = usePatientGoals(patientId || '');
  const { data: pathologies = [] } = usePatientPathologies(patientId || '');
  const { data: measurements = [] } = useEvolutionMeasurements(patientId || '');
  const { data: previousEvolutions = [] } = useSoapRecords(patientId || '', 10);

  const { completeAppointment, isCompleting } = useAppointmentActions();
  const { awardXp } = useGamification(patientId || '');
  const createSoapRecord = useCreateSoapRecord();

  // Calculate evolution stats
  const evolutionStats = useMemo(() => {
    const totalEvolutions = previousEvolutions.length;
    const completedGoals = goals.filter(g => g.status === 'concluido').length;
    const totalGoals = goals.length;
    const activePathologiesCount = pathologies.filter(p => p.status === 'em_tratamento').length;
    const totalMeasurements = measurements.length;

    const avgGoalProgress = goals.length > 0
      ? goals
        .filter(g => g.status === 'em_andamento')
        .reduce((sum) => sum + 50, 0) / Math.max(1, goals.filter(g => g.status === 'em_andamento').length)
      : 0;

    return {
      totalEvolutions,
      completedGoals,
      totalGoals,
      activePathologiesCount,
      totalMeasurements,
      avgGoalProgress: Math.round(avgGoalProgress),
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
    };
  }, [previousEvolutions, goals, pathologies, measurements]);

  // Handlers
  const handleSave = useCallback(async (soapData: Partial<SoapRecord>) => {
    if (!patientId) return;
    if (!soapData.subjective && !soapData.objective && !soapData.assessment && !soapData.plan) {
      return { error: 'Campos vazios' };
    }

    try {
      const record = await createSoapRecord.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        ...soapData
      });

      // Save to treatment_sessions (Firebase)
      const user = getCurrentUser();
      if (user && appointmentId) {
        // Check if session exists
        const q = firestoreQuery(
          collection(db, 'treatment_sessions'),
          where('appointment_id', '==', appointmentId),
          limit(1)
        );

        const snapshot = await getDocs(q);
        const existingSession = snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

        const sessionData = {
          patient_id: patientId,
          therapist_id: user.uid,
          appointment_id: appointmentId,
          session_date: new Date().toISOString(),
          session_type: 'treatment',
          pain_level_before: 0,
          pain_level_after: 0,
          functional_score_before: 0,
          functional_score_after: 0,
          exercises_performed: [],
          observations: soapData.assessment || '',
          status: 'completed',
          created_by: user.uid,
          updated_at: new Date().toISOString(),
        };

        if (existingSession) {
          await updateDoc(doc(db, 'treatment_sessions', existingSession.id), sessionData);
        } else {
          await addDoc(collection(db, 'treatment_sessions'), sessionData);
        }
      }

      return { data: record, error: null };
    } catch (error: unknown) {
      return { data: null, error: getErrorMessage(error) || 'Erro desconhecido' };
    }
  }, [patientId, appointmentId, createSoapRecord]);

  const handleCompleteSession = useCallback(async (soapData: Partial<SoapRecord>) => {
    if (!soapData.subjective && !soapData.objective && !soapData.assessment && !soapData.plan) {
      return { error: 'Campos vazios' };
    }

    const saveResult = await handleSave(soapData);
    if (!saveResult || saveResult.error) return saveResult || { error: 'Erro ao salvar' };

    if (appointmentId) {
      completeAppointment(appointmentId, {
        onSuccess: async () => {
          if (patientId) {
            try {
              await awardXp.mutateAsync({
                amount: 100,
                reason: 'session_completed',
                description: 'Sessão de fisioterapia concluída'
              });
            } catch (e) {
              logger.error("Failed to award XP", e, 'usePatientEvolution');
            }
          }
          setTimeout(() => navigate('/schedule'), 1500);
        }
      });
    }

    return saveResult;
  }, [appointmentId, patientId, handleSave, completeAppointment, awardXp, navigate]);

  return {
    data: {
      appointment,
      patient,
      patientId,
      surgeries,
      medicalReturns,
      goals,
      pathologies,
      measurements,
      previousEvolutions,
      evolutionStats
    } as PatientEvolutionData,
    loading: dataLoading,
    error: appointmentError || patientError,
    isSaving: createSoapRecord.isPending,
    isCompleting,
    handleSave,
    handleCompleteSession
  };
}
