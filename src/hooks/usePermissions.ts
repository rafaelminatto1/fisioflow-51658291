import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';

interface PermissionsResult {
  roles: AppRole[];
  isAdmin: boolean;
  isFisio: boolean;
  isEstagiario: boolean;
  isPaciente: boolean;
  canWrite: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  isLoading: boolean;
}

/**
 * Hook de permissões - TODOS os usuários autenticados são considerados admin
 * Isso simplifica o sistema e permite que qualquer usuário cadastrado tenha acesso total
 */
export function usePermissions(): PermissionsResult {
  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const isAuthenticated = !!user;

  // Todos os usuários autenticados são considerados admin
  const isAdmin = isAuthenticated;
  const isFisio = isAuthenticated;
  const isEstagiario = isAuthenticated;
  const isPaciente = false; // Paciente geralmente não é um usuário do sistema

  const canWrite = (_resourceType: string): boolean => {
    // Todos os usuários autenticados podem escrever
    return isAuthenticated;
  };

  const canDelete = (_resource: string): boolean => {
    // Todos os usuários autenticados podem deletar
    return isAuthenticated;
  };

  return {
    roles: isAuthenticated ? ['admin'] as AppRole[] : [],
    isAdmin,
    isFisio,
    isEstagiario,
    isPaciente,
    canWrite,
    canDelete,
    isLoading: false,
  };
}
