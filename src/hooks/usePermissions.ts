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

export function usePermissions(): PermissionsResult {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }
      
      return data.map(r => r.role as AppRole);
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const isAdmin = roles.includes('admin');
  const isFisio = roles.includes('fisioterapeuta');
  const isEstagiario = roles.includes('estagiario');
  const isPaciente = roles.includes('paciente');

  const canWrite = (resourceType: string): boolean => {
    if (isAdmin || isFisio) return true;
    if (isEstagiario) {
      return ['participantes', 'checklist'].includes(resourceType);
    }
    return false;
  };

  const canDelete = (_resource: string): boolean => {
    return isAdmin;
  };

  return {
    roles,
    isAdmin,
    isFisio,
    isEstagiario,
    isPaciente,
    canWrite,
    canDelete,
    isLoading,
  };
}
