import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { PatientProtocol } from "@/types";
import { useHaptics } from "./useHaptics";
import { fetchApi } from "@/lib/api";

export function usePatientProtocols(patientId: string | null) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: errorHaptic } = useHaptics();

  // Fetch all protocols for a patient
  const {
    data: patientProtocols = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["patient-protocols", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const response = await fetchApi<any>(`/api/patients/${patientId}/protocols`);
      return response.data as PatientProtocol[];
    },
    enabled: !!patientId,
  });

  // Apply protocol to patient
  const applyMutation = useMutation({
    mutationFn: async ({ protocolId, notes }: { protocolId: string; notes?: string }) => {
      if (!user?.id || !patientId) throw new Error("Missing required data");

      const response = await fetchApi<any>(`/api/patients/${patientId}/protocols`, {
        method: "POST",
        data: {
          protocolId,
          professionalId: user.id,
          notes: notes || "",
        },
      });

      return response.data?.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-protocols", patientId] });
      success();
    },
    onError: () => {
      errorHaptic();
    },
  });

  // Update protocol progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      await fetchApi(`/api/patients/${patientId}/protocols/${id}`, {
        method: "PUT",
        data: { progress },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-protocols", patientId] });
      success();
    },
    onError: () => {
      errorHaptic();
    },
  });

  // Remove protocol from patient (soft delete)
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetchApi(`/api/patients/${patientId}/protocols/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-protocols", patientId] });
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
