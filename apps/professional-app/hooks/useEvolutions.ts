import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEvolutions as apiGetEvolutions,
  createEvolution as apiCreateEvolution,
  updateEvolution as apiUpdateEvolution,
  deleteEvolution as apiDeleteEvolution,
  getEvolutionById as apiGetEvolutionById,
  duplicateEvolution as apiDuplicateEvolution,
  ApiEvolution,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { Evolution } from "@/types";
import { auditLogger } from "@/lib/services/auditLogger";

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
    notes: "",
    exercises: [],
  };
}

const DEFAULT_PAGE_SIZE = 10;

export function useEvolutions(patientId: string, pageSize = DEFAULT_PAGE_SIZE) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [currentPage, setCurrentPage] = useState(1);

  const query = useQuery({
    queryKey: ["patientEvolutions", patientId],
    queryFn: async () => {
      const data = await apiGetEvolutions(patientId);
      return data.map(mapApiEvolution);
    },
    enabled: !!patientId,
  });

  // Client-side pagination derived values
  const allEvolutions = query.data || [];
  const totalCount = allEvolutions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Clamp page to valid range whenever data changes
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEvolutions = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return allEvolutions.slice(start, start + pageSize);
  }, [allEvolutions, safeCurrentPage, pageSize]);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clamped);
  };

  const nextPage = () => goToPage(safeCurrentPage + 1);
  const prevPage = () => goToPage(safeCurrentPage - 1);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Omit<Evolution, "id" | "professionalId" | "createdAt">>) => {
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

      // Log audit event
      await auditLogger.logPHIModification(user.id, "create", "evolution", result.id);

      return mapApiEvolution(result);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patientEvolutions", variables.patientId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Evolution> }) => {
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

      // Log audit event
      if (user?.id) {
        await auditLogger.logPHIModification(user.id, "update", "evolution", id);
      }

      return mapApiEvolution(result);
    },
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ["patientEvolutions", data.patientId] });
      queryClient.invalidateQueries({ queryKey: ["evolution", id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiDeleteEvolution(id);

      // Log audit event
      if (user?.id) {
        await auditLogger.logPHIModification(user.id, "delete", "evolution", id);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientEvolutions", patientId] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiDuplicateEvolution(id);

      // Log audit event
      if (user?.id) {
        await auditLogger.logPHIModification(user.id, "create", "evolution", result.id);
      }

      return mapApiEvolution(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientEvolutions", patientId] });
      // Jump to page 1 so the duplicated session (newest) is visible
      setCurrentPage(1);
    },
  });

  return {
    // All evolutions (unpaginated) — kept for charts etc.
    evolutions: allEvolutions,
    // Paginated slice
    paginatedEvolutions,
    // Pagination state
    currentPage: safeCurrentPage,
    totalPages,
    totalCount,
    hasNextPage: safeCurrentPage < totalPages,
    hasPrevPage: safeCurrentPage > 1,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    // Loading states
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    // Mutations
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    duplicate: duplicateMutation.mutate,
    duplicateAsync: duplicateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
}

export function useEvolution(evolutionId?: string) {
  return useQuery({
    queryKey: ["evolution", evolutionId],
    queryFn: async () => {
      if (!evolutionId) return null;
      const data = await apiGetEvolutionById(evolutionId);
      return data ? mapApiEvolution(data) : null;
    },
    enabled: !!evolutionId,
  });
}
