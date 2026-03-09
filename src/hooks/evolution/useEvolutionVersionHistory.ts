/**
 * useEvolutionVersionHistory - Migrated to Neon/Workers
 *
 * Stores snapshots of SOAP records via the evolution_versions table.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evolutionVersionsApi } from '@/lib/api/workers-client';
import { fisioLogger as logger } from '@/lib/errors/logger';

const MAX_VERSIONS = 25;

export interface EvolutionVersion {
  id: string;
  soapRecordId: string;
  savedAt: string;
  savedBy: string;
  changeType: 'auto' | 'manual' | 'restore';
  content: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    pain_level?: number;
    evolution_notes?: string;
    v2_data?: Record<string, unknown>;
  };
}

const versionKeys = {
  all: ['evolution-versions'] as const,
  list: (recordId: string) => [...versionKeys.all, 'list', recordId] as const,
};

export function useEvolutionVersionHistory(soapRecordId?: string) {
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: versionKeys.list(soapRecordId ?? ''),
    queryFn: async () => {
      if (!soapRecordId) return [];
      const result = await evolutionVersionsApi.list(soapRecordId);
      return (result.data ?? []).slice(0, MAX_VERSIONS).map(row => ({
        id: row.id,
        soapRecordId: row.soap_record_id,
        savedAt: row.saved_at,
        savedBy: row.saved_by,
        changeType: row.change_type as EvolutionVersion['changeType'],
        content: row.content as EvolutionVersion['content'],
      })) as EvolutionVersion[];
    },
    enabled: !!soapRecordId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const saveVersionMutation = useMutation({
    mutationFn: async ({
      content,
      changeType = 'auto',
    }: {
      content: EvolutionVersion['content'];
      changeType?: 'auto' | 'manual' | 'restore';
    }) => {
      if (!soapRecordId) return null;
      const result = await evolutionVersionsApi.create({
        soap_record_id: soapRecordId,
        change_type: changeType,
        content: content as Record<string, unknown>,
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: versionKeys.list(soapRecordId ?? '') });
    },
    onError: (err) => {
      logger.error('Error saving evolution version', err, 'useEvolutionVersionHistory');
    },
  });

  const saveVersionForRecord = useCallback(
    async (
      explicitRecordId: string,
      content: EvolutionVersion['content'],
      changeType: 'auto' | 'manual' | 'restore' = 'auto'
    ) => {
      try {
        const result = await evolutionVersionsApi.create({
          soap_record_id: explicitRecordId,
          change_type: changeType,
          content: content as Record<string, unknown>,
        });
        return result.data?.id ?? null;
      } catch (err) {
        logger.error('Error saving evolution version', err, 'useEvolutionVersionHistory');
        return null;
      }
    },
    []
  );

  return {
    versions: versionsQuery.data ?? [],
    isLoading: versionsQuery.isLoading,
    saveVersion: saveVersionMutation.mutateAsync,
    saveVersionForRecord,
    isSaving: saveVersionMutation.isPending,
  };
}
