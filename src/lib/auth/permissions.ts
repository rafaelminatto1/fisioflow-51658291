import { UserRole } from '@/types/auth';

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'admin': 5,
  'fisioterapeuta': 4,
  'estagiario': 3,
  'parceiro': 2,
  'paciente': 1,
};

// Permission sets for different actions
export const PERMISSIONS = {
  // Patient management
  VIEW_ALL_PATIENTS: ['admin', 'fisioterapeuta'],
  VIEW_ASSIGNED_PATIENTS: ['fisioterapeuta', 'estagiario'],
  EDIT_PATIENT: ['admin', 'fisioterapeuta'],
  DELETE_PATIENT: ['admin'],
  
  // Session management
  CREATE_SESSION: ['admin', 'fisioterapeuta', 'estagiario'],
  VIEW_ALL_SESSIONS: ['admin', 'fisioterapeuta'],
  VIEW_ASSIGNED_SESSIONS: ['fisioterapeuta', 'estagiario'],
  EDIT_SESSION: ['admin', 'fisioterapeuta'],
  DELETE_SESSION: ['admin', 'fisioterapeuta'],
  
  // Exercise management
  CREATE_EXERCISE: ['admin', 'fisioterapeuta', 'parceiro'],
  VIEW_ALL_EXERCISES: ['admin', 'fisioterapeuta', 'estagiario', 'parceiro'],
  EDIT_EXERCISE: ['admin', 'fisioterapeuta', 'parceiro'],
  DELETE_EXERCISE: ['admin'],
  
  // Reports and analytics
  VIEW_ANALYTICS: ['admin', 'fisioterapeuta'],
  VIEW_REPORTS: ['admin', 'fisioterapeuta', 'estagiario'],
  EXPORT_DATA: ['admin', 'fisioterapeuta'],
  
  // System administration
  MANAGE_USERS: ['admin'],
  VIEW_SYSTEM_LOGS: ['admin'],
  SYSTEM_SETTINGS: ['admin'],
  
  // Financial
  VIEW_FINANCIAL: ['admin', 'fisioterapeuta'],
  MANAGE_BILLING: ['admin'],
  
  // Communication
  SEND_MESSAGES: ['admin', 'fisioterapeuta', 'estagiario', 'paciente'],
  BULK_MESSAGING: ['admin', 'fisioterapeuta'],
  
  // Profile management
  VIEW_OWN_PROFILE: ['admin', 'fisioterapeuta', 'estagiario', 'paciente', 'parceiro'],
  EDIT_OWN_PROFILE: ['admin', 'fisioterapeuta', 'estagiario', 'paciente', 'parceiro'],
  VIEW_OTHER_PROFILES: ['admin', 'fisioterapeuta'],
  EDIT_OTHER_PROFILES: ['admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(userRole: UserRole | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  
  const allowedRoles = PERMISSIONS[permission] as readonly UserRole[];
  return allowedRoles.includes(userRole);
}

/**
 * Check if a user role has any of the specified permissions
 */
export function hasAnyPermission(userRole: UserRole | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false;
  
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if a user role has all of the specified permissions
 */
export function hasAllPermissions(userRole: UserRole | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false;
  
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Check if user role is higher or equal in hierarchy
 */
export function hasRoleLevel(userRole: UserRole | undefined, minimumRole: UserRole): boolean {
  if (!userRole) return false;
  
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Get user role hierarchy level
 */
export function getRoleLevel(userRole: UserRole | undefined): number {
  if (!userRole) return 0;
  return ROLE_HIERARCHY[userRole];
}

/**
 * Check if user can access a specific user type's data
 */
export function canAccessUserType(userRole: UserRole | undefined, targetRole: UserRole): boolean {
  if (!userRole) return false;
  
  // Admin can access everything
  if (userRole === 'admin') return true;
  
  // Users can always access their own type
  if (userRole === targetRole) return true;
  
  // Physiotherapists can access patients and students
  if (userRole === 'fisioterapeuta') {
    return ['paciente', 'estagiario'].includes(targetRole);
  }
  
  // Students can access patients
  if (userRole === 'estagiario') {
    return targetRole === 'paciente';
  }
  
  return false;
}

/**
 * Get allowed actions for a user role
 */
export function getAllowedActions(userRole: UserRole | undefined): Permission[] {
  if (!userRole) return [];
  
  return Object.entries(PERMISSIONS)
    .filter(([_, allowedRoles]) => allowedRoles.includes(userRole))
    .map(([permission]) => permission as Permission);
}

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  'admin': 'Administrador',
  'fisioterapeuta': 'Fisioterapeuta',
  'estagiario': 'Estagiário',
  'paciente': 'Paciente',
  'parceiro': 'Educador Físico',
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  'admin': 'Acesso completo ao sistema e gerenciamento de usuários',
  'fisioterapeuta': 'Profissional qualificado para atendimento e gestão de pacientes',
  'estagiario': 'Estudante supervisionado com acesso limitado',
  'paciente': 'Usuário que recebe tratamento fisioterápico',
  'parceiro': 'Educador físico parceiro com acesso a exercícios',
};

/**
 * Get role display information
 */
export function getRoleInfo(role: UserRole | undefined) {
  if (!role) return { name: 'Não definido', description: 'Papel não atribuído', level: 0 };
  
  return {
    name: ROLE_DISPLAY_NAMES[role],
    description: ROLE_DESCRIPTIONS[role],
    level: ROLE_HIERARCHY[role],
  };
}