import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { TreatmentProtocol } from '@/types';
import { useHaptics } from './useHaptics';

export function useProtocols() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: errorHaptic } = useHaptics();

  // Fetch all protocols for the professional
  const { data: protocols = [], isLoading, error, refetch } = useQuery({
    queryKey: ['protocols', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const protocolsRef = collection(db, 'treatment_protocols');
      const q = query(
        protocolsRef,
        where('professionalId', '==', user.id),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as TreatmentProtocol[];
    },
    enabled: !!user?.id,
  });

  // Create protocol
  const createMutation = useMutation({
    mutationFn: async (data: Omit<TreatmentProtocol, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const protocolsRef = collection(db, 'treatment_protocols');
      const docRef = await addDoc(protocolsRef, {
        ...data,
        professionalId: user.id,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
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
      const protocolRef = doc(db, 'treatment_protocols', id);
      await updateDoc(protocolRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
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
      const protocolRef = doc(db, 'treatment_protocols', id);
      await updateDoc(protocolRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
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

      const protocolsRef = collection(db, 'treatment_protocols');
      const docRef = await addDoc(protocolsRef, {
        name: `${protocol.name} (Cópia)`,
        description: protocol.description,
        category: protocol.category,
        condition: protocol.condition,
        exercises: protocol.exercises,
        professionalId: user.id,
        isTemplate: protocol.isTemplate,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
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
