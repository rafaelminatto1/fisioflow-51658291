import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getEvolutions as apiGetEvolutions, 
    createEvolution as apiCreateEvolution, 
    updateEvolution as apiUpdateEvolution, 
    deleteEvolution as apiDeleteEvolution, 
    getEvolutionById as apiGetEvolutionById,
    ApiEvolution 
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Evolution } from '@/types';

// Map API evolution type to app Evolution type
function mapApiEvolution(apiEvolution: ApiEvolution): Evolution {
    return {
      id: apiEvolution.id,
      patientId: apiEvolution.patient_id,
      professionalId: apiEvolution.therapist_id,
      appointmentId: apiEvolution.appointment_id,
      date: new Date(apiEvolution.date),
      subjective: apiEvolution.subjective,
      objective: apiEvolution.objective,
      assessment: apiEvolution.assessment,
      plan: apiEvolution.plan,
      painLevel: apiEvolution.pain_level,
      attachments: apiEvolution.attachments || [],
      createdAt: new Date(apiEvolution.created_at),
      // The following fields are not in the new table, so we use defaults
      notes: '', 
      exercises: [],
    };
}

export function useEvolutions(patientId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: ['patientEvolutions', patientId],
    queryFn: async () => {
        const data = await apiGetEvolutions(patientId);
        return data.map(mapApiEvolution);
    },
    enabled: !!patientId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Omit<Evolution, 'id' | 'professionalId' | 'createdAt'>>) => {
        if (!user) throw new Error("User not authenticated");
        const apiData: Partial<ApiEvolution> = {
            patient_id: data.patientId,
            appointment_id: data.appointmentId,
            date: (data.date || new Date()).toISOString(),
            subjective: data.subjective,
            objective: data.objective,
            assessment: data.assessment,
            plan: data.plan,
            pain_level: data.painLevel,
            attachments: data.attachments,
        };
        const result = await apiCreateEvolution(apiData);
        return mapApiEvolution(result);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patientEvolutions', variables.patientId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Evolution> }) => {
        const apiData: Partial<ApiEvolution> = {
            date: data.date?.toISOString(),
            subjective: data.subjective,
            objective: data.objective,
            assessment: data.assessment,
            plan: data.plan,
            pain_level: data.painLevel,
            attachments: data.attachments,
        };
        const result = await apiUpdateEvolution(id, apiData);
        return mapApiEvolution(result);
    },
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['patientEvolutions', data.patientId] });
      queryClient.invalidateQueries({ queryKey: ['evolution', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteEvolution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientEvolutions', patientId] });
    },
  });

  return {
    evolutions: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useEvolution(evolutionId?: string) {
    return useQuery({
        queryKey: ['evolution', evolutionId],
        queryFn: async () => {
            if (!evolutionId) return null;
            const data = await apiGetEvolutionById(evolutionId);
            return data ? mapApiEvolution(data) : null;
        },
        enabled: !!evolutionId,
    });
}
