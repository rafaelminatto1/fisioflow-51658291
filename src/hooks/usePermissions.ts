import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserRole, RolePermissions } from '@/types/agenda';

// Define permissions for each role
const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canCreateAppointment: true,
    canEditAppointment: true,
    canDeleteAppointment: true,
    canViewAllAppointments: true,
    canManagePayments: true,
    canAccessFinancialData: true,
    canMarkSessionStatus: true,
    canAccessEvolutions: true,
  },
  therapist: {
    canCreateAppointment: true,
    canEditAppointment: true,
    canDeleteAppointment: true,
    canViewAllAppointments: true,
    canManagePayments: true,
    canAccessFinancialData: true,
    canMarkSessionStatus: true,
    canAccessEvolutions: true,
  },
  intern: {
    canCreateAppointment: false,
    canEditAppointment: false,
    canDeleteAppointment: false,
    canViewAllAppointments: true,
    canManagePayments: false,
    canAccessFinancialData: false,
    canMarkSessionStatus: true,
    canAccessEvolutions: true,
  },
  patient: {
    canCreateAppointment: false,
    canEditAppointment: false,
    canDeleteAppointment: false,
    canViewAllAppointments: false,
    canManagePayments: false,
    canAccessFinancialData: false,
    canMarkSessionStatus: false,
    canAccessEvolutions: false,
  },
};

// Define route permissions
const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/agenda': ['admin', 'therapist', 'intern'],
  '/agenda/new': ['admin', 'therapist'],
  '/patients': ['admin', 'therapist', 'intern'],
  '/patients/new': ['admin', 'therapist'],
  '/payments': ['admin', 'therapist'],
  '/analytics': ['admin', 'therapist'],
  '/settings': ['admin'],
  '/patient-portal': ['patient'],
  '/patient-portal/appointments': ['patient'],
  '/patient-portal/exercises': ['patient'],
};

interface UsePermissionsOptions {
  redirectOnUnauthorized?: boolean;
  fallbackRoute?: string;
}

interface UsePermissionsReturn {
  // Current user info
  userRole: UserRole | null;
  isAuthenticated: boolean;
  
  // Permission checks
  permissions: RolePermissions;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  canAccessRoute: (route: string) => boolean;
  
  // Specific permission helpers
  canCreateAppointment: boolean;
  canEditAppointment: boolean;
  canDeleteAppointment: boolean;
  canViewAllAppointments: boolean;
  canManagePayments: boolean;
  canAccessFinancialData: boolean;
  canMarkSessionStatus: boolean;
  canAccessEvolutions: boolean;
  
  // Role checks
  isAdmin: boolean;
  isTherapist: boolean;
  isIntern: boolean;
  isPatient: boolean;
  isStaff: boolean; // admin, therapist, or intern
  
  // Actions
  requirePermission: (permission: keyof RolePermissions, errorMessage?: string) => void;
  requireRole: (roles: UserRole | UserRole[], errorMessage?: string) => void;
  redirectToAuthorized: () => void;
  
  // Patient-specific permissions
  canViewPatientData: (patientId: string) => boolean;
  canEditPatientData: (patientId: string) => boolean;
}

// Mock user data - in real app, this would come from auth context
const getCurrentUser = () => {
  // This would typically come from your auth system
  // For now, we'll simulate getting it from localStorage or context
  const mockUser = {
    id: 'user1',
    role: 'therapist' as UserRole,
    patientId: null, // Only set if user is a patient
  };
  
  return mockUser;
};

export function usePermissions(options: UsePermissionsOptions = {}): UsePermissionsReturn {
  const { redirectOnUnauthorized = true, fallbackRoute = '/unauthorized' } = options;
  const navigate = useNavigate();
  
  // Get current user (this would come from auth context in real app)
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || null;
  const isAuthenticated = !!currentUser;

  // Get permissions for current role
  const permissions = useMemo(() => {
    if (!userRole) {
      return {
        canCreateAppointment: false,
        canEditAppointment: false,
        canDeleteAppointment: false,
        canViewAllAppointments: false,
        canManagePayments: false,
        canAccessFinancialData: false,
        canMarkSessionStatus: false,
        canAccessEvolutions: false,
      };
    }
    return ROLE_PERMISSIONS[userRole];
  }, [userRole]);

  // Permission check function
  const hasPermission = useCallback((permission: keyof RolePermissions): boolean => {
    return permissions[permission];
  }, [permissions]);

  // Route access check
  const canAccessRoute = useCallback((route: string): boolean => {
    if (!userRole) return false;
    
    // Check exact route match first
    if (ROUTE_PERMISSIONS[route]) {
      return ROUTE_PERMISSIONS[route].includes(userRole);
    }
    
    // Check parent routes (e.g., /agenda/123 should check /agenda)
    const routeParts = route.split('/').filter(Boolean);
    for (let i = routeParts.length; i > 0; i--) {
      const parentRoute = '/' + routeParts.slice(0, i).join('/');
      if (ROUTE_PERMISSIONS[parentRoute]) {
        return ROUTE_PERMISSIONS[parentRoute].includes(userRole);
      }
    }
    
    // Default: allow access if no specific restriction
    return true;
  }, [userRole]);

  // Role-based helpers
  const isAdmin = userRole === 'admin';
  const isTherapist = userRole === 'therapist';
  const isIntern = userRole === 'intern';
  const isPatient = userRole === 'patient';
  const isStaff = userRole ? ['admin', 'therapist', 'intern'].includes(userRole) : false;

  // Permission enforcement functions
  const requirePermission = useCallback((
    permission: keyof RolePermissions, 
    errorMessage?: string
  ) => {
    if (!hasPermission(permission)) {
      const message = errorMessage || `Você não tem permissão para: ${permission}`;
      
      if (redirectOnUnauthorized) {
        console.warn(message);
        navigate(fallbackRoute);
      } else {
        throw new Error(message);
      }
    }
  }, [hasPermission, redirectOnUnauthorized, navigate, fallbackRoute]);

  const requireRole = useCallback((
    roles: UserRole | UserRole[], 
    errorMessage?: string
  ) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      const message = errorMessage || `Acesso restrito aos roles: ${allowedRoles.join(', ')}`;
      
      if (redirectOnUnauthorized) {
        console.warn(message);
        navigate(fallbackRoute);
      } else {
        throw new Error(message);
      }
    }
  }, [userRole, redirectOnUnauthorized, navigate, fallbackRoute]);

  const redirectToAuthorized = useCallback(() => {
    if (!userRole) {
      navigate('/login');
      return;
    }

    // Redirect to appropriate dashboard based on role
    switch (userRole) {
      case 'admin':
      case 'therapist':
      case 'intern':
        navigate('/agenda');
        break;
      case 'patient':
        navigate('/patient-portal');
        break;
      default:
        navigate('/');
    }
  }, [userRole, navigate]);

  // Patient-specific permission checks
  const canViewPatientData = useCallback((patientId: string): boolean => {
    if (!userRole) return false;
    
    // Staff can view all patient data
    if (isStaff) return true;
    
    // Patients can only view their own data
    if (isPatient && currentUser?.patientId === patientId) return true;
    
    return false;
  }, [userRole, isStaff, isPatient, currentUser?.patientId]);

  const canEditPatientData = useCallback((patientId: string): boolean => {
    if (!userRole) return false;
    
    // Only admin and therapist can edit patient data
    if (isAdmin || isTherapist) return true;
    
    return false;
  }, [userRole, isAdmin, isTherapist]);

  return {
    // Current user info
    userRole,
    isAuthenticated,
    
    // Permission checks
    permissions,
    hasPermission,
    canAccessRoute,
    
    // Specific permission helpers
    canCreateAppointment: permissions.canCreateAppointment,
    canEditAppointment: permissions.canEditAppointment,
    canDeleteAppointment: permissions.canDeleteAppointment,
    canViewAllAppointments: permissions.canViewAllAppointments,
    canManagePayments: permissions.canManagePayments,
    canAccessFinancialData: permissions.canAccessFinancialData,
    canMarkSessionStatus: permissions.canMarkSessionStatus,
    canAccessEvolutions: permissions.canAccessEvolutions,
    
    // Role checks
    isAdmin,
    isTherapist,
    isIntern,
    isPatient,
    isStaff,
    
    // Actions
    requirePermission,
    requireRole,
    redirectToAuthorized,
    
    // Patient-specific permissions
    canViewPatientData,
    canEditPatientData,
  };
}

// Hook for protecting routes
export function useRouteProtection(requiredRoles?: UserRole | UserRole[]) {
  const { userRole, canAccessRoute, requireRole } = usePermissions();
  const navigate = useNavigate();

  const checkRouteAccess = useCallback((route: string) => {
    if (!canAccessRoute(route)) {
      navigate('/unauthorized');
      return false;
    }
    return true;
  }, [canAccessRoute, navigate]);

  // Check role requirements if specified
  if (requiredRoles) {
    try {
      requireRole(requiredRoles);
    } catch (error) {
      // Role check failed, user will be redirected
      return { hasAccess: false, userRole };
    }
  }

  return {
    hasAccess: true,
    userRole,
    checkRouteAccess,
  };
}

// Hook for conditional rendering based on permissions
export function useConditionalRender() {
  const permissions = usePermissions();

  const renderIfPermission = useCallback((
    permission: keyof RolePermissions,
    component: React.ReactNode,
    fallback?: React.ReactNode
  ) => {
    return permissions.hasPermission(permission) ? component : (fallback || null);
  }, [permissions]);

  const renderIfRole = useCallback((
    roles: UserRole | UserRole[],
    component: React.ReactNode,
    fallback?: React.ReactNode
  ) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const hasRole = permissions.userRole && allowedRoles.includes(permissions.userRole);
    return hasRole ? component : (fallback || null);
  }, [permissions]);

  const renderIfStaff = useCallback((
    component: React.ReactNode,
    fallback?: React.ReactNode
  ) => {
    return permissions.isStaff ? component : (fallback || null);
  }, [permissions]);

  return {
    renderIfPermission,
    renderIfRole,
    renderIfStaff,
    ...permissions,
  };
}

// Higher-order component for route protection
export function withPermissions<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermissions?: (keyof RolePermissions)[],
  requiredRoles?: UserRole[]
) {
  return function ProtectedComponent(props: T) {
    const permissions = usePermissions();

    // Check required permissions
    if (requiredPermissions) {
      for (const permission of requiredPermissions) {
        if (!permissions.hasPermission(permission)) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
                <p className="text-muted-foreground">
                  Você não tem permissão para acessar esta página.
                </p>
              </div>
            </div>
          );
        }
      }
    }

    // Check required roles
    if (requiredRoles && permissions.userRole) {
      if (!requiredRoles.includes(permissions.userRole)) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground">
                Esta página é restrita a: {requiredRoles.join(', ')}
              </p>
            </div>
          </div>
        );
      }
    }

    return <Component {...props} />;
  };
}