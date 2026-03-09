import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { PatientProtocol } from '@/types';
import { useHaptics } from './useHaptics';
import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';

const fetchApi = async (endpoint: string, method: string = 'GET', body?: any) => {
  const token = await authApi.getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${config.apiUrl}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

export function usePatientProtocols(patientId: string | null) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: errorHaptic } = useHaptics();

  // Fetch all protocols for a patient
  const { data: patientProtocols = [], isLoading, error, refetch } = useQuery({
    queryKey: ['patient-protocols', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const response = await fetchApi(`/api/patients/${patientId}/protocols`);
      return response.data as PatientProtocol[];
    },
    enabled: !!patientId,
  });

  // Apply protocol to patient
  const applyMutation = useMutation({
    mutationFn: async ({ protocolId, notes }: { protocolId: string; notes?: string }) => {
      if (!user?.id || !patientId) throw new Error('Missing required data');

      const response = await fetchApi(`/api/patients/${patientId}/protocols`, 'POST', {
        protocolId,
        professionalId: user.id,
        notes: notes || '',
      });

      return response.data?.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-protocols', patientId] });
      success();
    },
    onError: () => {
      errorHaptic();
    },
  });

  // Update protocol progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      await fetchApi(`/api/patients/${patientId}/protocols/${id}`, 'PUT', {
        progress,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-protocols', patientId] });
      success();
    },
    onError: () => {
      errorHaptic();
    },
  });

  // Remove protocol from patient (soft delete)
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetchApi(`/api/patients/${patientId}/protocols/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-protocols', patientId] });
      success();
    },
    onError: () => {
      errorHaptic();
    },
  });

  return {
    patientProtocols,
    isLoading,
    error,
    refetch,
    apply: applyMutation.mutateAsync,
    updateProgress: updateProgressMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    isApplying: applyMutation.isPending,
    isUpdating: updateProgressMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
