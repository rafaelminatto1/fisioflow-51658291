/**
 * useUsers - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('profiles') → Firestore collection 'profiles'
 * - supabase.from('user_roles') → Firestore collection 'user_roles'
 * - supabase.from('user_roles').upsert() → setDoc with merge
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';


type AppRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';

interface ProfileFirestore {
  user_id?: string;
  id: string;
  email?: string;
  full_name: string;
  created_at?: string;
  [key: string]: unknown;
}

interface UserRoleFirestore {
  user_id: string;
  role: AppRole;
  [key: string]: unknown;
}

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: AppRole[];
}

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // Fetch profiles
      const profilesQ = query(
        collection(db, 'profiles'),
        orderBy('created_at', 'desc')
      );
      const profilesSnap = await getDocs(profilesQ);

      const profiles = profilesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch user roles
      const rolesSnap = await getDocs(collection(db, 'user_roles'));
      const userRoles = rolesSnap.docs.map(doc => ({
        ...doc.data(),
      }));

      const usersWithRoles: UserWithRoles[] = profiles.map((profile: ProfileFirestore) => ({
        id: profile.user_id || profile.id,
        email: profile.email || '',
        full_name: profile.full_name,
        created_at: profile.created_at || '',
        roles: userRoles
          .filter((ur: UserRoleFirestore) => ur.user_id === (profile.user_id || profile.id))
          .map((ur: UserRoleFirestore) => ur.role as AppRole),
      }));

      return usersWithRoles;
    },
    staleTime: 2 * 60 * 1000,
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Use user_id + role as composite key for document ID
      const roleDocId = `${userId}_${role}`;
      const roleRef = doc(db, 'user_roles', roleDocId);

      // Check if role already exists
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        throw { code: 'already_exists', message: 'Role already exists for this user' };
      }

      await setDoc(roleRef, {
        user_id: userId,
        role,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({ title: 'Função adicionada com sucesso' });
    },
    onError: (error: { code?: string; message?: string }) => {
      // If error is about duplicate, show a more friendly message
      if (error?.code === 'already_exists') {
        toast({
          title: 'Função já existe',
          description: 'Este usuário já possui esta função.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao adicionar função',
          description: error.message || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const roleDocId = `${userId}_${role}`;
      const roleRef = doc(db, 'user_roles', roleDocId);

      // Check if role exists before deleting
      const roleSnap = await getDoc(roleRef);
      if (!roleSnap.exists()) {
        throw new Error('Role not found');
      }

      await deleteDoc(roleRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({ title: 'Função removida com sucesso' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover função',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    users,
    isLoading,
    addRole: addRoleMutation.mutate,
    removeRole: removeRoleMutation.mutate,
  };
}
