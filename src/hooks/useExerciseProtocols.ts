/**
 * useExerciseProtocols - Leitura e mutations via Workers API (Neon PostgreSQL)
 *
 * Migrado: Firestore → Workers API (POST/PUT/DELETE /api/protocols)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { protocolsApi, type Protocol as WorkersProtocol } from '@/lib/api/workers-client';
import { toast } from 'sonner';

export interface ProtocolMilestone {
  week: number;
  description: string;
}

export interface ProtocolRestriction {
  week_start: number;
  week_end?: number;
  description: string;
}

export interface ExerciseProtocol {
  id: string;
  name: string;
  condition_name: string;
  protocol_type: 'pos_operatorio' | 'patologia';
  evidence_level?: string;
  weeks_total?: number;
  milestones: ProtocolMilestone[] | Record<string, unknown>;
  restrictions: ProtocolRestriction[] | Record<string, unknown>;
  progression_criteria: Record<string, unknown>[] | Record<string, unknown>;
  references?: {
    title: string;
    authors: string;
    year: number;
    url?: string;
    journal?: string;
  }[];
  clinical_tests?: string[];
  organization_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  wiki_page_id?: string | null;
}

/**
 * Mapeia formato camelCase do Worker → snake_case do App
 */
const mapWorkerToAppProtocol = (p: WorkersProtocol): ExerciseProtocol => ({
  id: p.id,
  name: p.name,
  condition_name: p.conditionName || '',
  protocol_type: p.protocolType as any,
  evidence_level: p.evidenceLevel || undefined,
  weeks_total: p.weeksTotal || undefined,
  milestones: [],
  restrictions: [],
  progression_criteria: [],
  wiki_page_id: p.wikiPageId || null,
});

/**
 * Mapeia formato snake_case do App → camelCase do Worker
 */
const mapAppToWorkerProtocol = (
  p: Omit<ExerciseProtocol, 'id' | 'created_at' | 'updated_at'>,
): Record<string, unknown> => ({
  name: p.name,
  conditionName: p.condition_name,
  protocolType: p.protocol_type,
  evidenceLevel: p.evidence_level,
  weeksTotal: p.weeks_total,
  milestones: p.milestones,
  restrictions: p.restrictions,
  progressionCriteria: p.progression_criteria,
  references: p.references,
  clinicalTests: p.clinical_tests,
  wikiPageId: p.wiki_page_id,
});

export const useWorkersProtocols = (filters?: {
  q?: string;
  type?: string;
  evidenceLevel?: string;
  page?: number;
  limit?: number;
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workers-protocols', filters],
    queryFn: () => protocolsApi.list(filters),
    staleTime: 1000 * 60 * 5,
  });

  const protocols = (data?.data ?? []).map(mapWorkerToAppProtocol);

  return {
    protocols,
    meta: data?.meta,
    loading: isLoading,
    error,
    refetch,
  };
};

export const useExerciseProtocols = () => {
  const queryClient = useQueryClient();

  const { protocols, loading, error, refetch } = useWorkersProtocols({ limit: 500 });

  const createMutation = useMutation({
    mutationFn: async (protocol: Omit<ExerciseProtocol, 'id' | 'created_at' | 'updated_at'>) => {
      const workerData = mapAppToWorkerProtocol(protocol);
      const result = await protocolsApi.create(workerData as any);
      return mapWorkerToAppProtocol(result.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-protocols'] });
      toast.success('Protocolo criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar protocolo: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...protocol }: Partial<ExerciseProtocol> & { id: string }) => {
      const workerData: Record<string, unknown> = {};
      if (protocol.name !== undefined) workerData.name = protocol.name;
      if (protocol.condition_name !== undefined) workerData.conditionName = protocol.condition_name;
      if (protocol.protocol_type !== undefined) workerData.protocolType = protocol.protocol_type;
      if (protocol.evidence_level !== undefined) workerData.evidenceLevel = protocol.evidence_level;
      if (protocol.weeks_total !== undefined) workerData.weeksTotal = protocol.weeks_total;
      if (protocol.milestones !== undefined) workerData.milestones = protocol.milestones;
      if (protocol.restrictions !== undefined) workerData.restrictions = protocol.restrictions;
      if (protocol.progression_criteria !== undefined) workerData.progressionCriteria = protocol.progression_criteria;
      if (protocol.references !== undefined) workerData.references = protocol.references;
      if (protocol.clinical_tests !== undefined) workerData.clinicalTests = protocol.clinical_tests;
      if (protocol.wiki_page_id !== undefined) workerData.wikiPageId = protocol.wiki_page_id;

      const result = await protocolsApi.update(id, workerData as any);
      return mapWorkerToAppProtocol(result.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-protocols'] });
      toast.success('Protocolo atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar protocolo: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await protocolsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-protocols'] });
      toast.success('Protocolo excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir protocolo: ' + error.message);
    },
  });

  const effectiveLoading = loading && protocols.length === 0;

  return {
    protocols,
    loading: effectiveLoading,
    error,
    refetch,
    createProtocol: createMutation.mutate,
    updateProtocol: updateMutation.mutate,
    deleteProtocol: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};