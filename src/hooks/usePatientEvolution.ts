import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface PatientSurgery {
  id: string;
  patient_id: string;
  surgery_name: string;
  surgery_date: string;
  affected_side: 'direito' | 'esquerdo' | 'bilateral';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientGoal {
  id: string;
  patient_id: string;
  goal_title: string;
  goal_description?: string;
  target_date?: string;
  target_value?: string;
  status: 'em_andamento' | 'concluido' | 'cancelado';
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PatientPathology {
  id: string;
  patient_id: string;
  pathology_name: string;
  diagnosis_date?: string;
  status: 'em_tratamento' | 'tratada' | 'cronica';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PathologyRequiredMeasurement {
  id: string;
  pathology_name: string;
  measurement_name: string;
  measurement_unit?: string;
  alert_level: 'high' | 'medium' | 'low';
  instructions?: string;
}

export interface EvolutionMeasurement {
  id: string;
  soap_record_id?: string;
  patient_id: string;
  measurement_type: string;
  measurement_name: string;
  value: number;
  unit?: string;
  notes?: string;
  measured_at: string;
  created_by: string;
  created_at: string;
}

// Hook para cirurgias
export const usePatientSurgeries = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-surgeries', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_surgeries')
        .select('*')
        .eq('patient_id', patientId)
        .order('surgery_date', { ascending: false });
      
      if (error) throw error;
      return data as PatientSurgery[];
    },
    enabled: !!patientId
  });
};

// Hook para objetivos
export const usePatientGoals = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-goals', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_goals')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PatientGoal[];
    },
    enabled: !!patientId
  });
};

// Hook para patologias
export const usePatientPathologies = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-pathologies', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_pathologies')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PatientPathology[];
    },
    enabled: !!patientId
  });
};

// Hook para medições obrigatórias baseadas nas patologias
export const useRequiredMeasurements = (pathologyNames: string[]) => {
  return useQuery({
    queryKey: ['required-measurements', pathologyNames],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pathology_required_measurements')
        .select('*')
        .in('pathology_name', pathologyNames);
      
      if (error) throw error;
      return data as PathologyRequiredMeasurement[];
    },
    enabled: pathologyNames.length > 0
  });
};

// Hook para medições de evolução
export const useEvolutionMeasurements = (patientId: string) => {
  return useQuery({
    queryKey: ['evolution-measurements', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evolution_measurements')
        .select('*')
        .eq('patient_id', patientId)
        .order('measured_at', { ascending: false });
      
      if (error) throw error;
      return data as EvolutionMeasurement[];
    },
    enabled: !!patientId
  });
};

// Hook para criar medição
export const useCreateMeasurement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (measurement: Omit<EvolutionMeasurement, 'id' | 'created_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('evolution_measurements')
        .insert({
          ...measurement,
          created_by: userData.user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evolution-measurements', data.patient_id] });
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
      const { data: goal, error } = await supabase
        .from('patient_goals')
        .update(data)
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) throw error;
      return goal as PatientGoal;
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
      const { data: goal, error } = await supabase
        .from('patient_goals')
        .update({ status: 'concluido', completed_at: new Date().toISOString() })
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) throw error;
      return goal as PatientGoal;
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
    mutationFn: async (goal: Omit<PatientGoal, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('patient_goals')
        .insert({
          ...goal,
          created_by: userData.user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals', data.patient_id] });
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
      const updates: any = { status };
      if (status === 'concluido') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('patient_goals')
        .update(updates)
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals', data.patient_id] });
      toast({
        title: 'Objetivo atualizado',
        description: 'O status do objetivo foi atualizado.'
      });
    }
  });
};
