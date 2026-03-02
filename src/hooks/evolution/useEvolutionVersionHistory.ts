/**
 * useEvolutionVersionHistory - Firestore-based version history for evolution notes
 *
 * Inspired by Notion's version history, stores snapshots of SOAP records
 * in Firestore subcollections. Enables viewing and restoring previous versions.
 *
 * Architecture:
 *   soap_records/{recordId}/versions/{versionId}
 *     - content: snapshot of the SOAP fields
 *     - savedAt: timestamp
 *     - savedBy: userId
 *     - changeType: 'auto' | 'manual' | 'restore'
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  db,
  collection,
  doc,
  addDoc,
  getDocs,
  orderBy,
  query as firestoreQuery,
  limit,
  serverTimestamp,
} from '@/integrations/firebase/app';
import { getFirebaseAuth } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

const auth = getFirebaseAuth();

// Max versions to keep per record (to control storage costs)
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

async function fetchVersions(recordId: string): Promise<EvolutionVersion[]> {
  if (!recordId) return [];
  try {
    const versionsRef = collection(db, 'soap_records', recordId, 'versions');
    const q = firestoreQuery(versionsRef, orderBy('savedAt', 'desc'), limit(MAX_VERSIONS));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      soapRecordId: recordId,
      ...d.data(),
      savedAt: d.data().savedAt?.toDate?.()?.toISOString() ?? d.data().savedAt,
    })) as EvolutionVersion[];
  } catch (err) {
    logger.error('Error fetching evolution versions', err, 'useEvolutionVersionHistory');
    return [];
  }
}

async function saveVersion(
  recordId: string,
  content: EvolutionVersion['content'],
  changeType: 'auto' | 'manual' | 'restore' = 'auto'
): Promise<string | null> {
  if (!recordId) return null;
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const versionsRef = collection(db, 'soap_records', recordId, 'versions');
    const docRef = await addDoc(versionsRef, {
      savedAt: serverTimestamp(),
      savedBy: user.uid,
      changeType,
      content,
    });
    logger.info('Evolution version saved', { recordId, versionId: docRef.id }, 'useEvolutionVersionHistory');
    return docRef.id;
  } catch (err) {
    logger.error('Error saving evolution version', err, 'useEvolutionVersionHistory');
    return null;
  }
}

export function useEvolutionVersionHistory(soapRecordId?: string) {
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: versionKeys.list(soapRecordId ?? ''),
    queryFn: () => fetchVersions(soapRecordId ?? ''),
    enabled: !!soapRecordId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const saveVersionMutation = useMutation({
    mutationFn: ({
      content,
      changeType,
    }: {
      content: EvolutionVersion['content'];
      changeType?: 'auto' | 'manual' | 'restore';
    }) => saveVersion(soapRecordId ?? '', content, changeType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: versionKeys.list(soapRecordId ?? '') });
    },
  });

  const saveVersionForRecord = useCallback(
    (
      explicitRecordId: string,
      content: EvolutionVersion['content'],
      changeType: 'auto' | 'manual' | 'restore' = 'auto'
    ) => saveVersion(explicitRecordId, content, changeType),
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
