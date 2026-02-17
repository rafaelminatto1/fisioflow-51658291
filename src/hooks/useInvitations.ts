/**
 * useInvitations - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, getFirebaseAuth, db } from '@/integrations/firebase/app';
import { toast } from '@/hooks/use-toast';
import { normalizeFirestoreData } from '@/utils/firestoreData';

const auth = getFirebaseAuth();

export type AppRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';

export interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  invited_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface CreateInvitationInput {
  email: string;
  role: AppRole;
}

export interface UpdateInvitationInput {
  invitationId: string;
  email: string;
  role: AppRole;
  expiresAt: string;
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

const normalizeInvitationEmail = (email: string): string => email.trim().toLowerCase();

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

  const deleteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
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
    mutationFn: async ({ email, role }: CreateInvitationInput) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      const normalizedEmail = normalizeInvitationEmail(email);

      // Check if there's already a pending invitation for this email
      const existingQ = firestoreQuery(
        collection(db, 'user_invitations'),
        where('email', '==', normalizedEmail),
        where('used_at', '==', null)
      );
      const existingSnap = await getDocs(existingQ);

      const hasPendingInvitation = existingSnap.docs.some(existingDoc => {
        const existing = existingDoc.data();
        return Boolean(existing.expires_at && !isInvitationExpired(existing.expires_at));
      });

      if (hasPendingInvitation) {
        throw new Error('Já existe um convite pendente para este email');
      }

      // Create invitation (expires in 7 days)
      const token = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitationData = {
        email: normalizedEmail,
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

  const updateMutation = useMutation({
    mutationFn: async ({ invitationId, email, role, expiresAt }: UpdateInvitationInput) => {
      const normalizedEmail = normalizeInvitationEmail(email);
      const docRef = doc(db, 'user_invitations', invitationId);
      const invitationSnap = await getDoc(docRef);

      if (!invitationSnap.exists()) {
        throw new Error('Convite não encontrado');
      }

      const invitation = normalizeFirestoreData(invitationSnap.data()) as Omit<Invitation, 'id'>;

      if (invitation.used_at) {
        throw new Error('Não é possível editar um convite já utilizado');
      }

      const existingQ = firestoreQuery(
        collection(db, 'user_invitations'),
        where('email', '==', normalizedEmail),
        where('used_at', '==', null)
      );
      const existingSnap = await getDocs(existingQ);

      const hasAnotherPendingInvitation = existingSnap.docs.some(existingDoc => {
        if (existingDoc.id === invitationId) return false;
        const existing = existingDoc.data();
        return Boolean(existing.expires_at && !isInvitationExpired(existing.expires_at));
      });

      if (hasAnotherPendingInvitation) {
        throw new Error('Já existe outro convite pendente para este email');
      }

      const parsedExpiresAt = new Date(expiresAt);
      if (Number.isNaN(parsedExpiresAt.getTime())) {
        throw new Error('Data de expiração inválida');
      }

      await updateDoc(docRef, {
        email: normalizedEmail,
        role,
        expires_at: parsedExpiresAt.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Convite atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    invitations,
    isLoading,
    revokeInvitation: deleteMutation.mutateAsync,
    deleteInvitation: deleteMutation.mutateAsync,
    createInvitation: createMutation.mutateAsync,
    updateInvitation: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
