import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  hasRoleLevel,
  canAccessUserType,
  getAllowedActions,
  getRoleInfo,
  type Permission 
} from '@/lib/auth/permissions';
import { UserRole } from '@/types/auth';

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const { role, user, profile, loading } = useAuth();

  const permissions = useMemo(() => {
    return {
      // Core permission checking functions
      can: (permission: Permission) => hasPermission(role, permission),
      canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
      canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
      hasRole: (minimumRole: UserRole) => hasRoleLevel(role, minimumRole),
      canAccess: (targetRole: UserRole) => canAccessUserType(role, targetRole),
      
      // Get user information
      getAllowed: () => getAllowedActions(role),
      getRoleInfo: () => getRoleInfo(role),
      
      // Convenience methods for common permissions
      isAdmin: () => role === 'admin',
      isProfessional: () => role === 'fisioterapeuta' || role === 'estagiario',
      isTherapist: () => role === 'fisioterapeuta',
      isStudent: () => role === 'estagiario',
      isPatient: () => role === 'paciente',
      isPartner: () => role === 'parceiro',
      
      // Patient management permissions
      canViewAllPatients: () => hasPermission(role, 'VIEW_ALL_PATIENTS'),
      canViewAssignedPatients: () => hasPermission(role, 'VIEW_ASSIGNED_PATIENTS'),
      canEditPatient: () => hasPermission(role, 'EDIT_PATIENT'),
      canDeletePatient: () => hasPermission(role, 'DELETE_PATIENT'),
      
      // Session management permissions
      canCreateSession: () => hasPermission(role, 'CREATE_SESSION'),
      canViewAllSessions: () => hasPermission(role, 'VIEW_ALL_SESSIONS'),
      canViewAssignedSessions: () => hasPermission(role, 'VIEW_ASSIGNED_SESSIONS'),
      canEditSession: () => hasPermission(role, 'EDIT_SESSION'),
      canDeleteSession: () => hasPermission(role, 'DELETE_SESSION'),
      
      // Exercise management permissions
      canCreateExercise: () => hasPermission(role, 'CREATE_EXERCISE'),
      canViewAllExercises: () => hasPermission(role, 'VIEW_ALL_EXERCISES'),
      canEditExercise: () => hasPermission(role, 'EDIT_EXERCISE'),
      canDeleteExercise: () => hasPermission(role, 'DELETE_EXERCISE'),
      
      // Analytics and reports
      canViewAnalytics: () => hasPermission(role, 'VIEW_ANALYTICS'),
      canViewReports: () => hasPermission(role, 'VIEW_REPORTS'),
      canExportData: () => hasPermission(role, 'EXPORT_DATA'),
      
      // System administration
      canManageUsers: () => hasPermission(role, 'MANAGE_USERS'),
      canViewSystemLogs: () => hasPermission(role, 'VIEW_SYSTEM_LOGS'),
      canManageSystemSettings: () => hasPermission(role, 'SYSTEM_SETTINGS'),
      
      // Financial
      canViewFinancial: () => hasPermission(role, 'VIEW_FINANCIAL'),
      canManageBilling: () => hasPermission(role, 'MANAGE_BILLING'),
      
      // Communication
      canSendMessages: () => hasPermission(role, 'SEND_MESSAGES'),
      canSendBulkMessages: () => hasPermission(role, 'BULK_MESSAGING'),
      
      // Profile management
      canViewOwnProfile: () => hasPermission(role, 'VIEW_OWN_PROFILE'),
      canEditOwnProfile: () => hasPermission(role, 'EDIT_OWN_PROFILE'),
      canViewOtherProfiles: () => hasPermission(role, 'VIEW_OTHER_PROFILES'),
      canEditOtherProfiles: () => hasPermission(role, 'EDIT_OTHER_PROFILES'),
    };
  }, [role]);

  return {
    ...permissions,
    role,
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    hasProfile: !!profile,
  };
}

/**
 * Hook to check a specific permission
 */
export function useHasPermission(permission: Permission) {
  const { role } = useAuth();
  return useMemo(() => hasPermission(role, permission), [role, permission]);
}

/**
 * Hook to check multiple permissions (any)
 */
export function useHasAnyPermission(permissions: Permission[]) {
  const { role } = useAuth();
  return useMemo(() => hasAnyPermission(role, permissions), [role, permissions]);
}

/**
 * Hook to check multiple permissions (all)
 */
export function useHasAllPermissions(permissions: Permission[]) {
  const { role } = useAuth();
  return useMemo(() => hasAllPermissions(role, permissions), [role, permissions]);
}

/**
 * Hook to check role level
 */
export function useHasRole(minimumRole: UserRole) {
  const { role } = useAuth();
  return useMemo(() => hasRoleLevel(role, minimumRole), [role, minimumRole]);
}

/**
 * Hook for role-based access control
 */
export function useRoleAccess() {
  const { role } = useAuth();
  
  return useMemo(() => ({
    isAdmin: role === 'admin',
    isProfessional: ['fisioterapeuta', 'estagiario'].includes(role || ''),
    isTherapist: role === 'fisioterapeuta',
    isStudent: role === 'estagiario',
    isPatient: role === 'paciente',
    isPartner: role === 'parceiro',
    
    canAccessAdminArea: role === 'admin',
    canAccessProfessionalArea: ['admin', 'fisioterapeuta', 'estagiario'].includes(role || ''),
    canAccessPatientArea: ['admin', 'fisioterapeuta', 'estagiario', 'paciente'].includes(role || ''),
    canAccessPartnerArea: ['admin', 'parceiro'].includes(role || ''),
  }), [role]);
}

export default usePermissions;