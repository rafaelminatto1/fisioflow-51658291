/**
 * useSessionPackages - Migrated to Firebase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query as firestoreQuery, where, orderBy, runTransaction, getFirebaseAuth, db } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';

const auth = getFirebaseAuth();

export interface SessionPackage {
  id: string;
  organization_id: string;
  patient_id: string;
  package_name: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  total_value: number;
  discount_value: number;
  final_value: number;
  value_per_session: number;
  payment_status: string;
  payment_method?: string;
  paid_at?: string;
  status: 'ativo' | 'consumido' | 'expirado' | 'cancelado';
  valid_until?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useSessionPackages = (patientId?: string) => {
  return useQuery({
    queryKey: ['session-packages', patientId],
    queryFn: async () => {
      let q = firestoreQuery(
        collection(db, 'session_packages'),
        orderBy('created_at', 'desc')
      );

      if (patientId) {
        q = firestoreQuery(
          collection(db, 'session_packages'),
          where('patient_id', '==', patientId),
          orderBy('created_at', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionPackage[];
    },
  });
};

export const useCreatePackage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (packageData: Omit<SessionPackage, 'id' | 'created_at' | 'updated_at' | 'remaining_sessions' | 'value_per_session' | 'used_sessions'>) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      const now = new Date().toISOString();
      const remainingSessions = packageData.total_sessions;
      const valuePerSession = packageData.final_value / packageData.total_sessions;

      const newPackageData = {
        ...packageData,
        created_by: firebaseUser.uid,
        used_sessions: 0,
        remaining_sessions: remainingSessions,
        value_per_session: Math.round(valuePerSession * 100) / 100, // Round to 2 decimal places
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, 'session_packages'), newPackageData);

      return {
        id: docRef.id,
        ...newPackageData,
      } as SessionPackage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast({ title: 'Pacote criado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar pacote', variant: 'destructive' });
    },
  });
};

export const useUsePackageSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const packageRef = doc(db, 'session_packages', packageId);

      // Use transaction to ensure atomicity
      await runTransaction(db, async (transaction) => {
        const packageSnap = await getDoc(packageRef);

        if (!packageSnap.exists()) {
          throw new Error('Pacote não encontrado');
        }

        const pkg = packageSnap.data() as SessionPackage;

        if (pkg.status !== 'ativo') {
          throw new Error('Pacote não está ativo');
        }

        if (pkg.remaining_sessions <= 0) {
          throw new Error('Não há sessões disponíveis neste pacote');
        }

        // Check if package is expired
        if (pkg.valid_until && new Date(pkg.valid_until) < new Date()) {
          throw new Error('Pacote expirado');
        }

        const newUsedSessions = pkg.used_sessions + 1;
        const newRemainingSessions = pkg.remaining_sessions - 1;

        // Update status if consumed
        let newStatus = pkg.status;
        if (newRemainingSessions === 0) {
          newStatus = 'consumido';
        }

        transaction.update(packageRef, {
          used_sessions: newUsedSessions,
          remaining_sessions: newRemainingSessions,
          status: newStatus,
          updated_at: new Date().toISOString(),
        });

        return { id: packageId, ...pkg, used_sessions: newUsedSessions, remaining_sessions: newRemainingSessions, status: newStatus };
      });

      // Fetch updated package
      const updatedSnap = await getDoc(packageRef);
      return {
        id: updatedSnap.id,
        ...updatedSnap.data(),
      } as SessionPackage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast({ title: 'Sessão debitada do pacote' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao debitar sessão',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
};
