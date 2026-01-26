/**
 * useOrganizationMembers - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('organization_members') → Firestore collection 'organization_members'
 * - Joins with profiles replaced with separate queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getFirebaseDb } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

const db = getFirebaseDb();

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';
  active: boolean;
  joined_at: string;
  profiles?: {
    full_name: string;
    email: string | null;
  } | null;
}

export const useOrganizationMembers = (organizationId?: string) => {
  const queryClient = useQueryClient();

  // Query para listar membros
  const { data: members, isLoading, error } = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const q = query(
        collection(db, 'organization_members'),
        where('organization_id', '==', organizationId),
        where('active', '==', true),
        orderBy('joined_at', 'desc')
      );

      const snapshot = await getDocs(q);

      // Fetch profile data for all members
      const membersWithProfiles = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = { id: doc.id, ...doc.data() };
          let profileData = null;

          if (data.user_id) {
            const profileDoc = await getDoc(doc(db, 'profiles', data.user_id));
            if (profileDoc.exists()) {
              profileData = {
                full_name: profileDoc.data().full_name,
                email: profileDoc.data().email,
              };
            }
          }

          return {
            ...data,
            profiles: profileData,
          } as OrganizationMember;
        })
      );

      return membersWithProfiles;
    },
    enabled: !!organizationId,
  });

  // Mutation para adicionar membro
  const addMember = useMutation({
    mutationFn: async (memberData: {
      organization_id: string;
      user_id: string;
      role: 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';
    }) => {
      const data = {
        ...memberData,
        active: true,
        joined_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'organization_members'), data);
      const docSnap = await getDoc(docRef);

      return { id: docRef.id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Membro adicionado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar membro: ' + error.message);
    },
  });

  // Mutation para atualizar role do membro
  const updateMemberRole = useMutation({
    mutationFn: async ({
      id,
      role
    }: {
      id: string;
      role: 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';
    }) => {
      const docRef = doc(db, 'organization_members', id);
      await updateDoc(docRef, { role });

      const docSnap = await getDoc(docRef);
      return { id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Permissão atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar permissão: ' + error.message);
    },
  });

  // Mutation para remover membro
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const docRef = doc(db, 'organization_members', memberId);
      await updateDoc(docRef, { active: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Membro removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover membro: ' + error.message);
    },
  });

  return {
    members,
    isLoading,
    error,
    addMember: addMember.mutate,
    updateMemberRole: updateMemberRole.mutate,
    removeMember: removeMember.mutate,
    isAdding: addMember.isPending,
    isUpdating: updateMemberRole.isPending,
    isRemoving: removeMember.isPending,
  };
};
