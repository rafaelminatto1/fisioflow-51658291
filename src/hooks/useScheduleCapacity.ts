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

  // Get organization ID from user
  const { data: orgMember } = useQuery({
    queryKey: ['org-member', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const organizationId = orgMember?.organization_id;

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
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity'] });
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

  // Helper para obter capacidade de um horário específico
  const getCapacityForTime = (dayOfWeek: number, time: string): number => {
    if (!capacities) return 1; // Default: 1 paciente por horário

    const timeMinutes = time.split(':').map(Number);
    const checkTime = timeMinutes[0] * 60 + timeMinutes[1];

    const matchingConfig = capacities.find(config => {
      if (config.day_of_week !== dayOfWeek) return false;

      const startMinutes = config.start_time.split(':').map(Number);
      const endMinutes = config.end_time.split(':').map(Number);
      const startTime = startMinutes[0] * 60 + startMinutes[1];
      const endTime = endMinutes[0] * 60 + endMinutes[1];

      return checkTime >= startTime && checkTime < endTime;
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
    createCapacity: createCapacity.mutate,
    updateCapacity: updateCapacity.mutate,
    deleteCapacity: deleteCapacity.mutate,
    getCapacityForTime,
    isCreating: createCapacity.isPending,
    isUpdating: updateCapacity.isPending,
    isDeleting: deleteCapacity.isPending,
  };
}
