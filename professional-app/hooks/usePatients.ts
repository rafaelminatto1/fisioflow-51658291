import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import type { Patient } from '@/types';
import { getPatients as apiGetPatients, getPatientById as apiGetPatientById, createPatient as apiCreatePatient, updatePatient as apiUpdatePatient, deletePatient as apiDeletePatient, type ApiPatient } from '@/lib/api';

export interface UsePatientsOptions {
  status?: 'active' | 'inactive' | 'Em Tratamento';
  limit?: number;
  organizationId?: string;
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
    status: (apiPatient.status === 'Em Tratamento' || apiPatient.status === 'active') ? 'active' : 'inactive',
    notes: apiPatient.observations,
    progress: apiPatient.progress,
    organization_id: undefined,
    createdAt: apiPatient.created_at || new Date(),
    updatedAt: apiPatient.updated_at || new Date(),
  };
}

export function usePatients(options?: UsePatientsOptions) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const patients = useQuery({
    queryKey: ['patients', user?.id, options],
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('[usePatients] Fetching patients for user:', user.id, 'orgId:', user.organizationId);

      // Try with organizationId first
      let apiPatients = await apiGetPatients(user.organizationId, {
        status: options?.status === 'active' ? 'Em Tratamento' : options?.status,
        limit: options?.limit || 100,
      });

      // If no patients and no organizationId, try without organization filter
      if (apiPatients.length === 0 && !user.organizationId) {
        console.log('[usePatients] No orgId, trying without organization filter');
        apiPatients = await apiGetPatients(undefined, {
          status: options?.status === 'active' ? 'Em Tratamento' : options?.status,
          limit: options?.limit || 100,
        });
      }

      console.log('[usePatients] Received', apiPatients.length, 'patients from API');
      return apiPatients.map(mapApiPatient);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'clinicId'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      const apiPatient = await apiCreatePatient({
        name: data.name,
        email: data.email,
        phone: data.phone,
        birth_date: typeof data.birthDate === 'string' ? data.birthDate : data.birthDate?.toISOString(),
        main_condition: data.condition,
        status: data.status === 'active' ? 'Em Tratamento' : data.status,
        notes: data.notes,
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
      if (data.birthDate) updateData.birth_date = typeof data.birthDate === 'string' ? data.birthDate : data.birthDate.toISOString();
      if (data.condition !== undefined) updateData.main_condition = data.condition;
      if (data.status) updateData.status = data.status === 'active' ? 'Em Tratamento' : data.status;
      if (data.notes !== undefined) updateData.observations = data.notes;

      const apiPatient = await apiUpdatePatient(id, updateData);
      return mapApiPatient(apiPatient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeletePatient(id),
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
export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    const apiPatient = await apiGetPatientById(id);
    return apiPatient ? mapApiPatient(apiPatient) : null;
  } catch {
    return null;
  }
}
