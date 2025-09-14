import { useAuth } from '@/hooks/useAuth';

export function usePermissions() {
  const { profile } = useAuth();

  const hasPermission = (permission: string) => {
    if (!profile?.role) return false;
    
    // Admin has all permissions
    if (profile.role === 'admin') return true;
    
    // Basic role-based permissions
    const rolePermissions = {
      fisioterapeuta: ['read_patients', 'write_patients', 'read_appointments', 'write_appointments'],
      estagiario: ['read_patients', 'read_appointments'],
      paciente: ['read_own_data'],
      parceiro: ['read_own_data', 'write_sessions']
    };
    
    return rolePermissions[profile.role]?.includes(permission) || false;
  };

  return {
    hasPermission,
    canRead: (resource: string) => hasPermission(`read_${resource}`),
    canWrite: (resource: string) => hasPermission(`write_${resource}`),
    isAdmin: profile?.role === 'admin',
    isTherapist: profile?.role === 'fisioterapeuta',
    role: profile?.role
  };
}