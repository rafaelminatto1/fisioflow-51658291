import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { TreatmentProtocol } from '@/types';
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

export function useProtocols() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: errorHaptic } = useHaptics();

  // Fetch all protocols for the professional
  const { data: protocols = [], isLoading, error, refetch } = useQuery({
    queryKey: ['protocols', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchApi(`/api/protocols?professionalId=${user.id}`);
      return response.data as TreatmentProtocol[];
    },
    enabled: !!user?.id,
  });

  // Create protocol
  const createMutation = useMutation({
    mutationFn: async (data: Omit<TreatmentProtocol, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await fetchApi('/api/protocols', 'POST', {
        ...data,
        professionalId: user.id,
      });
      return response.data?.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      success();
    },
    onError: () => {
      errorHaptic();
    },
  });

  // Update protocol
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TreatmentProtocol> }) => {
      await fetchApi(`/api/protocols/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      success();
    },
    onError: () => {
      errorHaptic();
    },
  });

  // Delete protocol (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetchApi(`/api/protocols/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      success();
    },
    onError: () => {
      errorHaptic();
    },
  });

  // Duplicate protocol
  const duplicateMutation = useMutation({
    mutationFn: async (protocolId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const protocol = protocols.find(p => p.id === protocolId);
      if (!protocol) throw new Error('Protocol not found');

      const response = await fetchApi(`/api/protocols/${protocolId}/duplicate`, 'POST');
      return response.data?.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      success();
    },
    onError: () => {
      errorHaptic();
    },
  });

  return {
    protocols,
    isLoading,
    error,
    refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    duplicate: duplicateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
}
