import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { PatientProtocol, TreatmentProtocol } from '@/types';
import { useHaptics } from './useHaptics';

export function usePatientProtocols(patientId: string | null) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: errorHaptic } = useHaptics();

  // Fetch all protocols for a patient
  const { data: patientProtocols = [], isLoading, error, refetch } = useQuery({
    queryKey: ['patient-protocols', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const patientProtocolsRef = collection(db, 'patient_protocols');
      const q = query(
        patientProtocolsRef,
        where('patientId', '==', patientId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const protocols = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          
          // Fetch the protocol details
          let protocol: TreatmentProtocol | undefined;
          if (data.protocolId) {
            const protocolRef = doc(db, 'treatment_protocols', data.protocolId);
            const protocolSnap = await getDoc(protocolRef);
            if (protocolSnap.exists()) {
              protocol = {
                id: protocolSnap.id,
                ...protocolSnap.data(),
                createdAt: protocolSnap.data().createdAt?.toDate(),
                updatedAt: protocolSnap.data().updatedAt?.toDate(),
              } as TreatmentProtocol;
            }
          }

          return {
            id: docSnapshot.id,
            ...data,
            protocol,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as PatientProtocol;
        })
      );

      return protocols;
    },
    enabled: !!patientId,
  });

  // Apply protocol to patient
  const applyMutation = useMutation({
    mutationFn: async ({ protocolId, notes }: { protocolId: string; notes?: string }) => {
      if (!user?.id || !patientId) throw new Error('Missing required data');

      const patientProtocolsRef = collection(db, 'patient_protocols');
      const docRef = await addDoc(patientProtocolsRef, {
        patientId,
        protocolId,
        professionalId: user.id,
        startDate: serverTimestamp(),
        isActive: true,
        progress: 0,
        notes: notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
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
      const patientProtocolRef = doc(db, 'patient_protocols', id);
      await updateDoc(patientProtocolRef, {
        progress,
        updatedAt: serverTimestamp(),
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
      const patientProtocolRef = doc(db, 'patient_protocols', id);
      await updateDoc(patientProtocolRef, {
        isActive: false,
        endDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
