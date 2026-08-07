import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/v2/client";
import type { Partnership } from "@/types";

export interface CreatePartnershipData {
  name: string;
  description?: string;
  studentSessionFee: number;
  professorPays: boolean;
  professorSessionFee: number;
  isActive?: boolean;
}

export interface UpdatePartnershipData extends Partial<CreatePartnershipData> {
  id: string;
}

export function usePartnerships() {
  const queryClient = useQueryClient();

  const partnershipsQuery = useQuery({
    queryKey: ["partnerships"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Partnership[] }>("/api/partnerships");
      return response.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreatePartnershipData) => {
      const response = await apiClient.post<{ data: Partnership }>("/api/partnerships", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnerships"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdatePartnershipData) => {
      const response = await apiClient.put<{ data: Partnership }>(`/api/partnerships/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnerships"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete<{ success: boolean }>(`/api/partnerships/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnerships"] });
    },
  });

  return {
    partnerships: partnershipsQuery.data || [],
    isLoading: partnershipsQuery.isLoading,
    isError: partnershipsQuery.isError,
    refetch: partnershipsQuery.refetch,
    createPartnership: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updatePartnership: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deletePartnership: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
