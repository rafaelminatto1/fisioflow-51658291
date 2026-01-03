import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { z } from 'zod';

const capacitySchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string(),
  end_time: z.string(),
  max_patients: z.number().min(1).max(20),
});

export type CapacityFormData = z.infer<typeof capacitySchema>;

export interface ScheduleCapacity {
  id: string;
  organization_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_patients: number;
  created_at: string;
  updated_at: string;
}

export function useScheduleCapacity() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get organization ID from profiles table (avoids RLS recursion issue)
  const { data: profile } = useQuery({
    queryKey: ['profile-org', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const organizationId = profile?.organization_id;

  const { data: capacities, isLoading } = useQuery({
    queryKey: ['schedule-capacity', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('schedule_capacity_config')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduleCapacity[];
    },
    enabled: !!organizationId,
  });

  const createCapacity = useMutation({
    mutationFn: async (formData: CapacityFormData) => {
      if (!organizationId) {
        throw new Error('Organização não encontrada. Tente novamente.');
      }
      
      const validated = capacitySchema.parse(formData);

      const { data, error } = await supabase
        .from('schedule_capacity_config')
        .insert({
          day_of_week: validated.day_of_week,
          start_time: validated.start_time,
          end_time: validated.end_time,
          max_patients: validated.max_patients,
          organization_id: organizationId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity', organizationId] });
      toast({
        title: 'Configuração salva',
        description: 'A capacidade de horário foi configurada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Criar múltiplas configurações (uma para cada dia selecionado)
  const createMultipleCapacities = useMutation({
    mutationFn: async (formDataArray: CapacityFormData[]) => {
      if (!organizationId) {
        throw new Error('Organização não encontrada. Tente novamente.');
      }

      const insertData = formDataArray.map(formData => {
        const validated = capacitySchema.parse(formData);
        return {
          day_of_week: validated.day_of_week,
          start_time: validated.start_time,
          end_time: validated.end_time,
          max_patients: validated.max_patients,
          organization_id: organizationId,
        };
      });

      const { data, error } = await supabase
        .from('schedule_capacity_config')
        .insert(insertData as any)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity', organizationId] });
      const count = data?.length || 0;
      toast({
        title: 'Configurações salvas',
        description: `${count} configuração(ões) de capacidade foram salvas com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar configurações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateCapacity = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CapacityFormData> & { id: string }) => {
      const { error } = await supabase
        .from('schedule_capacity_config')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity'] });
      toast({
        title: 'Configuração atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCapacity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedule_capacity_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity'] });
      toast({
        title: 'Configuração removida',
        description: 'A configuração foi removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper para converter horário em minutos
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Verifica se dois intervalos de tempo se sobrepõem
  const checkTimeOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const start1Min = timeToMinutes(start1);
    const end1Min = timeToMinutes(end1);
    const start2Min = timeToMinutes(start2);
    const end2Min = timeToMinutes(end2);

    // Dois intervalos se sobrepõem se:
    // - O início do novo está dentro do existente, OU
    // - O fim do novo está dentro do existente, OU
    // - O novo contém completamente o existente
    return (
      (start2Min >= start1Min && start2Min < end1Min) ||
      (end2Min > start1Min && end2Min <= end1Min) ||
      (start2Min <= start1Min && end2Min >= end1Min)
    );
  };

  // Verifica conflitos com configurações existentes
  const checkConflicts = (
    selectedDays: number[],
    startTime: string,
    endTime: string
  ): { hasConflict: boolean; conflicts: Array<{ day: number; dayLabel: string; start: string; end: string }> } => {
    if (!capacities || capacities.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    const conflicts: Array<{ day: number; dayLabel: string; start: string; end: string }> = [];
    const dayLabels: Record<number, string> = {
      0: 'Domingo',
      1: 'Segunda-feira',
      2: 'Terça-feira',
      3: 'Quarta-feira',
      4: 'Quinta-feira',
      5: 'Sexta-feira',
      6: 'Sábado',
    };

    for (const day of selectedDays) {
      const existingConfigs = capacities.filter(c => c.day_of_week === day);
      
      for (const config of existingConfigs) {
        if (checkTimeOverlap(config.start_time, config.end_time, startTime, endTime)) {
          conflicts.push({
            day,
            dayLabel: dayLabels[day],
            start: config.start_time,
            end: config.end_time,
          });
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  };

  // Helper para obter capacidade de um horário específico
  const getCapacityForTime = (dayOfWeek: number, time: string): number => {
    if (!capacities) return 1; // Default: 1 paciente por horário

    const timeMinutes = timeToMinutes(time);

    const matchingConfig = capacities.find(config => {
      if (config.day_of_week !== dayOfWeek) return false;

      const startTime = timeToMinutes(config.start_time);
      const endTime = timeToMinutes(config.end_time);

      return timeMinutes >= startTime && timeMinutes < endTime;
    });

    return matchingConfig?.max_patients || 1;
  };

  const daysOfWeek = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
  ];

  return {
    capacities: capacities || [],
    isLoading,
    daysOfWeek,
    organizationId,
    createCapacity: createCapacity.mutate,
    createMultipleCapacities: createMultipleCapacities.mutate,
    updateCapacity: updateCapacity.mutate,
    deleteCapacity: deleteCapacity.mutate,
    getCapacityForTime,
    checkConflicts,
    isCreating: createCapacity.isPending || createMultipleCapacities.isPending,
    isUpdating: updateCapacity.isPending,
    isDeleting: deleteCapacity.isPending,
  };
}
