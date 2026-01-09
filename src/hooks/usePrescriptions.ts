import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

export interface PrescriptionExercise {
  id: string;
  name: string;
  description?: string;
  sets: number;
  repetitions: number;
  frequency: string;
  observations?: string;
  video_url?: string;
  image_url?: string;
  completed?: boolean;
  completed_at?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  therapist_id?: string;
  qr_code: string;
  title: string;
  exercises: PrescriptionExercise[];
  notes?: string;
  validity_days: number;
  valid_until?: string;
  status: 'ativo' | 'concluido' | 'expirado' | 'cancelado';
  view_count: number;
  last_viewed_at?: string;
  completed_exercises: string[];
  created_at: string;
  updated_at: string;
  organization_id?: string;
  patient?: {
    id: string;
    name: string;
    phone?: string;
  };
  therapist?: {
    id: string;
    full_name?: string;
  };
}

export const usePrescriptions = (patientId?: string) => {
  const queryClient = useQueryClient();

  const { data: prescriptions = [], isLoading, error } = useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: async () => {
      let query = supabase
        .from('exercise_prescriptions')
        .select(`
          *,
          patient:patients(id, name, phone),
          therapist:profiles!exercise_prescriptions_therapist_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Prescription[];
    },
    enabled: true,
  });

  const createMutation = useMutation({
    mutationFn: async (prescription: {
      patient_id: string;
      title?: string;
      exercises: PrescriptionExercise[];
      notes?: string;
      validity_days?: number;
    }) => {
      const validityDays = prescription.validity_days || 30;
      const validUntil = format(addDays(new Date(), validityDays), 'yyyy-MM-dd');

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('user_id', userData.user?.id)
        .single();

      const { data, error } = await supabase
        .from('exercise_prescriptions')
        .insert([{
          patient_id: prescription.patient_id,
          therapist_id: profile?.id,
          title: prescription.title || 'Prescrição de Reabilitação',
          exercises: JSON.parse(JSON.stringify(prescription.exercises)),
          notes: prescription.notes,
          validity_days: validityDays,
          valid_until: validUntil,
          organization_id: profile?.organization_id,
        }])
        .select(`
          *,
          patient:patients(id, name, phone),
          therapist:profiles!exercise_prescriptions_therapist_id_fkey(id, full_name)
        `)
        .single();

      if (error) throw error;
      return data as unknown as Prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescrição criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar prescrição: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, exercises, ...updates }: Partial<Prescription> & { id: string }) => {
      const updateData: any = { ...updates };
      if (exercises) {
        updateData.exercises = JSON.parse(JSON.stringify(exercises));
      }
      const { data, error } = await supabase
        .from('exercise_prescriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescrição atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescrição excluída');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  return {
    prescriptions,
    loading: isLoading,
    error,
    createPrescription: createMutation.mutateAsync,
    updatePrescription: updateMutation.mutate,
    deletePrescription: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook para buscar prescrição pública (sem autenticação)
export const usePublicPrescription = (qrCode: string) => {
  const queryClient = useQueryClient();

  const { data: prescription, isLoading, error } = useQuery({
    queryKey: ['public-prescription', qrCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_prescriptions')
        .select(`
          *,
          patient:patients(id, name:full_name),
          therapist:profiles!exercise_prescriptions_therapist_id_fkey(id, full_name)
        `)
        .eq('qr_code', qrCode)
        .single();

      if (error) throw error;

      // Incrementar visualização
      await supabase
        .from('exercise_prescriptions')
        .update({
          view_count: (data.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      return data as unknown as Prescription;
    },
    enabled: !!qrCode,
  });

  const markExerciseComplete = useMutation({
    mutationFn: async ({ prescriptionId, exerciseId }: { prescriptionId: string; exerciseId: string }) => {
      const { data: current } = await supabase
        .from('exercise_prescriptions')
        .select('completed_exercises, exercises')
        .eq('id', prescriptionId)
        .single();

      const completedExercises = Array.isArray(current?.completed_exercises)
        ? current.completed_exercises
        : [];

      const isCompleted = completedExercises.includes(exerciseId);
      const newCompleted = isCompleted
        ? completedExercises.filter((id: string) => id !== exerciseId)
        : [...completedExercises, exerciseId];

      const { error } = await supabase
        .from('exercise_prescriptions')
        .update({ completed_exercises: newCompleted })
        .eq('id', prescriptionId);

      if (error) throw error;
      return newCompleted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-prescription', qrCode] });
    },
  });

  return {
    prescription,
    loading: isLoading,
    error,
    markExerciseComplete: markExerciseComplete.mutate,
    isMarking: markExerciseComplete.isPending,
  };
};
