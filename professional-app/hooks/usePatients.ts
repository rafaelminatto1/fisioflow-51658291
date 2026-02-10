import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import type { Patient } from '@/types';
import { getPatients, getPatientById, createPatient, updatePatient, deletePatient, type ApiPatient } from '@/lib/api';

export interface UsePatientsOptions {
  status?: 'active' | 'inactive' | 'Em_Tratamento';
  limit?: number;
  search?: string;
}


// Map API patient type to app Patient type
function mapApiPatient(apiPatient: ApiPatient): Patient {
  return {
    id: apiPatient.id,
    userId: undefined,
    name: apiPatient.name || apiPatient.full_name || 'Sem nome',
    email: apiPatient.email || undefined,
    phone: apiPatient.phone || undefined,
    birthDate: apiPatient.birth_date,
    condition: apiPatient.main_condition || apiPatient.observations,
    diagnosis: undefined,
    notes: apiPatient.observations,
    status: (apiPatient.is_active !== false) ? 'active' : 'inactive',
    progress: apiPatient.progress,
    lastVisit: undefined,
    organization_id: undefined,
    createdAt: apiPatient.created_at || new Date(),
    updatedAt: apiPatient.updated_at || new Date(),
  };
}

// Reverse map app status to API status
function mapToApiStatus(status: Patient['status']): string {
  // When creating/updating, if status is 'active', we set it to 'Em_Tratamento' as default
  // This might need to be 'Inicial' depending on business logic, but preserving existing behavior for now
  return status === 'active' ? 'Em_Tratamento' : status;
}

export function usePatients(options?: UsePatientsOptions) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const patients = useQuery({
    queryKey: ['patients', user?.id, options],
    queryFn: () => {
      if (!user?.id) return [];

      return getPatients(user.organizationId, {
        // If status is 'active', we want ALL active patients (backend defaults to is_active=true)
        // So we pass undefined. Only pass specific status if it's NOT 'active' (e.g. 'inactive' - though backend might not support it yet, or specific enums)
        // If options.status is 'Em_Tratamento', we pass that.
        status: options?.status === 'active' ? undefined : options?.status,
        search: options?.search,
        limit: options?.limit || 100,
      }).then(data => data.map(mapApiPatient));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'clinicId'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const apiPatient = await createPatient({
        name: data.name,
        email: data.email,
        phone: data.phone,
        birth_date: typeof data.birthDate === 'string' ? data.birthDate : data.birthDate?.toISOString().split('T')[0],
        main_condition: data.condition,
        status: mapToApiStatus(data.status),
        observations: data.notes,
      });

      return mapApiPatient(apiPatient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Patient> }) => {
      const updateData: Partial<ApiPatient> = {};
      if (data.name) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.birthDate) updateData.birth_date = typeof data.birthDate === 'string' ? data.birthDate : data.birthDate.toISOString().split('T')[0];
      if (data.condition !== undefined) updateData.main_condition = data.condition;
      if (data.status) updateData.status = mapToApiStatus(data.status);
      if (data.notes !== undefined) updateData.observations = data.notes;

      const apiPatient = await updatePatient(id, updateData);
      return mapApiPatient(apiPatient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  return {
    data: patients.data || [],
    isLoading: patients.isLoading,
    error: patients.error,
    refetch: patients.refetch,
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

// Additional function to get a single patient
export async function getPatientByIdHook(id: string): Promise<Patient | null> {
  try {
    const apiPatient = await getPatientById(id);
    return apiPatient ? mapApiPatient(apiPatient) : null;
  } catch {
    return null;
  }
}
