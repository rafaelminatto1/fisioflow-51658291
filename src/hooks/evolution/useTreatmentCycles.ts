/**
 * useTreatmentCycles - Firestore CRUD hook for treatment cycles
 *
 * Linear-inspired sprint/cycle tracking for patient treatment plans.
 * Collection: treatment_cycles/{cycleId}
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  db,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query as firestoreQuery,
  where,
  serverTimestamp,
} from '@/integrations/firebase/app';
import { getFirebaseAuth } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { TreatmentCycle } from '@/components/evolution/TreatmentCycles';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const cycleKeys = {
  all: ['treatment-cycles'] as const,
  list: (patientId: string) => [...cycleKeys.all, 'list', patientId] as const,
};

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

async function fetchCycles(patientId: string): Promise<TreatmentCycle[]> {
  if (!patientId) return [];
  try {
    const ref = collection(db, 'treatment_cycles');
    const q = firestoreQuery(
      ref,
      where('patient_id', '==', patientId),
      orderBy('startDate', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TreatmentCycle, 'id'>),
    }));
  } catch (err) {
    logger.error('Error fetching treatment cycles', err, 'useTreatmentCycles');
    return [];
  }
}

export type CreateCycleInput = Omit<TreatmentCycle, 'id'> & { patient_id?: string };
export type UpdateCycleInput = Partial<Omit<TreatmentCycle, 'id'>>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTreatmentCycles(patientId: string) {
  const queryClient = useQueryClient();
  const auth = getFirebaseAuth();

  // --- Query ---
  const cyclesQuery = useQuery({
    queryKey: cycleKeys.list(patientId),
    queryFn: () => fetchCycles(patientId),
    enabled: !!patientId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // --- Create ---
  const createCycleMutation = useMutation({
    mutationFn: async (input: CreateCycleInput) => {
      const user = auth.currentUser;
      const ref = collection(db, 'treatment_cycles');
      const docRef = await addDoc(ref, {
        ...input,
        patient_id: input.patient_id ?? patientId,
        therapistId: input.therapistId ?? user?.uid ?? '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.list(patientId) });
    },
    onError: (err) => {
      logger.error('Error creating treatment cycle', err, 'useTreatmentCycles');
    },
  });

  // --- Update ---
  const updateCycleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCycleInput }) => {
      const ref = doc(db, 'treatment_cycles', id);
      await updateDoc(ref as Parameters<typeof updateDoc>[0], {
        ...data,
        updated_at: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.list(patientId) });
    },
    onError: (err) => {
      logger.error('Error updating treatment cycle', err, 'useTreatmentCycles');
    },
  });

  // --- Delete ---
  const deleteCycleMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      await deleteDoc(doc(db, 'treatment_cycles', cycleId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cycleKeys.list(patientId) });
    },
    onError: (err) => {
      logger.error('Error deleting treatment cycle', err, 'useTreatmentCycles');
    },
  });

  return {
    cycles: cyclesQuery.data ?? [],
    isLoading: cyclesQuery.isLoading,
    createCycle: createCycleMutation.mutateAsync,
    isCreating: createCycleMutation.isPending,
    updateCycle: updateCycleMutation.mutateAsync,
    isUpdating: updateCycleMutation.isPending,
    deleteCycle: deleteCycleMutation.mutateAsync,
    isDeleting: deleteCycleMutation.isPending,
  };
}
