/**
 * useInvitations - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, limit, getFirebaseAuth, db } from '@/integrations/firebase/app';
import { toast } from '@/hooks/use-toast';
import { normalizeFirestoreData } from '@/utils/firestoreData';

const auth = getFirebaseAuth();

type AppRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  invited_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// Helper to generate invitation token
const generateInvitationToken = (): string => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};

// Helper to check if invitation is expired
const isInvitationExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

export function useInvitations() {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'user_invitations'),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as Invitation[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      // Firebase doesn't have RPC functions - this would normally be a Cloud Function
      // For now, we'll delete the invitation document
      const docRef = doc(db, 'user_invitations', invitationId);
      await deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Convite revogado com sucesso' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao revogar convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      // Check if there's already a pending invitation for this email
      const existingQ = firestoreQuery(
        collection(db, 'user_invitations'),
        where('email', '==', email),
        where('used_at', '==', null),
        limit(1)
      );
      const existingSnap = await getDocs(existingQ);

      if (!existingSnap.empty) {
        // Check if existing invitation is expired
        const existing = existingSnap.docs[0].data();
        if (existing.expires_at && !isInvitationExpired(existing.expires_at)) {
          throw new Error('Já existe um convite pendente para este email');
        }
      }

      // Create invitation (expires in 7 days)
      const token = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitationData = {
        email,
        role,
        token,
        invited_by: firebaseUser.uid,
        expires_at: expiresAt.toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'user_invitations'), invitationData);

      return {
        id: docRef.id,
        ...invitationData,
      } as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Convite criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    invitations,
    isLoading,
    revokeInvitation: revokeMutation.mutate,
    createInvitation: createMutation.mutate,
  };
}