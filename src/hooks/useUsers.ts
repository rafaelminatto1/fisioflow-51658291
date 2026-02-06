import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { functions } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { httpsCallable } from 'firebase/functions';
import { UserRole } from '@/types/auth';

interface UserData {
  uid: string;
  email?: string;
  displayName?: string;
  role: UserRole;
  photoURL?: string;
  disabled: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
}

interface ListUsersResponse {
  users: UserData[];
}

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const listUsersFn = httpsCallable<void, ListUsersResponse>(functions, 'listUsers');
      const result = await listUsersFn();
      return result.data.users.map(u => ({
        id: u.uid,
        email: u.email || '',
        full_name: u.displayName || u.email || 'Usuário sem nome',
        // UI expects array of roles currently, but we moved to single role.
        // Adapter: just wrap in array or better, update UI later.
        // For now let's return the simplified object the UI expects but with single role logic
        roles: [u.role], // Array for compatibility
        role: u.role,    // Single source of truth
        created_at: u.metadata.creationTime,
        disabled: u.disabled
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const updateRoleFn = httpsCallable<{ userId: string; role: UserRole }, { success: boolean }>(functions, 'updateUserRole');

      // Since we only support single role now, "adding" a role means "setting" the role.
      // The UI might try to add multiple, but backend enforces one.
      await updateRoleFn({ userId, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      toast({ title: 'Função do usuário atualizada com sucesso' });
    },
    onError: (error: unknown) => {
      logger.error('Update role error', error, 'useUsers');
      toast({
        title: 'Erro ao atualizar função',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  // Adapter for "addRole" to match existing API signature but perform setRole
  const addRole = updateUserRoleMutation.mutate;

  // Adapter for "removeRole" - effectively sets to 'paciente' or 'pending' or whatever default?
  // For now, let's treat it as a reset to 'paciente' if explicitly removed.
  const removeRole = (params: { userId: string; role: string }) => {
    updateUserRoleMutation.mutate({ userId: params.userId, role: 'paciente' as UserRole });
  };

  return {
    users,
    isLoading,
    addRole,
    updateRole: updateUserRoleMutation.mutate,
    removeRole
  };
}
