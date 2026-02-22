import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TreatmentProtocol } from '@/types';

export function useProtocol(id: string | null) {
  const { data: protocol, isLoading, error, refetch } = useQuery({
    queryKey: ['protocol', id],
    queryFn: async () => {
      if (!id) return null;

      const protocolRef = doc(db, 'treatment_protocols', id);
      const snapshot = await getDoc(protocolRef);

      if (!snapshot.exists()) {
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
        createdAt: snapshot.data().createdAt?.toDate(),
        updatedAt: snapshot.data().updatedAt?.toDate(),
      } as TreatmentProtocol;
    },
    enabled: !!id,
  });

  return {
    protocol,
    isLoading,
    error,
    refetch,
  };
}
