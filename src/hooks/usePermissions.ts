import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

interface PermissionsResult {
  roles: UserRole[];
  isAdmin: boolean;
  isFisio: boolean;
  isEstagiario: boolean;
  isPaciente: boolean;
  isRecepcionista: boolean;
  isParceiro: boolean;
  canWrite: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  isLoading: boolean;
}

/**
 * Hook de permissões baseado no perfil do usuário do Firebase/Cloud SQL
 */
export function usePermissions(): PermissionsResult {
  const { profile, loading, initialized } = useAuth();

  const isAdmin = profile?.role === 'admin';
  const isFisio = profile?.role === 'fisioterapeuta';
  const isEstagiario = profile?.role === 'estagiario';
  const isPaciente = profile?.role === 'paciente';
  const isRecepcionista = profile?.role === 'recepcionista';
  const isParceiro = profile?.role === 'parceiro';

  const canWrite = (_resourceType: string): boolean => {
    // Admins e profissionais podem escrever
    return isAdmin || isFisio || isEstagiario || isRecepcionista;
  };

  const canDelete = (_resource: string): boolean => {
    // Apenas admins e fisioterapeutas seniores podem deletar (exemplo)
    return isAdmin || isFisio;
  };

  return {
    roles: profile?.role ? [profile.role] : [],
    isAdmin,
    isFisio,
    isEstagiario,
    isPaciente,
    isRecepcionista,
    isParceiro,
    canWrite,
    canDelete,
    isLoading: !initialized || loading,
  };
}
