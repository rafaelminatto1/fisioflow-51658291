/**
 * Navigation Guards
 *
 * Middleware para proteger rotas baseado em autenticação e roles.
 * Implementa redirecionamentos automáticos e validação de permissões.
 */

import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';

/**
 * Tipos de usuário do sistema
 */
export type UserRole = 'patient' | 'professional' | 'admin' | 'fisioterapeuta';

/**
 * Tipo de rota
 */
export type RouteType = 'public' | 'private' | 'role-based';

/**
 * Configuração de rota protegida
 */
export interface RouteConfig {
  path: string;
  type: RouteType;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  requireAuth?: boolean;
  requireSubscription?: boolean;
}

/**
 * Mapa de rotas protegidas
 */
export const PROTECTED_ROUTES: Record<string, RouteConfig> = {
  // Rotas públicas
  '/': { path: '/', type: 'public' },
  '/(auth)/login': { path: '/(auth)/login', type: 'public' },
  '/(auth)/register': { path: '/(auth)/register', type: 'public' },
  '/(auth)/forgot-password': { path: '/(auth)/forgot-password', type: 'public' },

  // Rotas privadas (requer autenticação)
  '/(tabs)/patients': { path: '/(tabs)/patients', type: 'private', requireAuth: true },
  '/(tabs)/appointments': { path: '/(tabs)/appointments', type: 'private', requireAuth: true },
  '/(tabs)/profile': { path: '/(tabs)/profile', type: 'private', requireAuth: true },
  '/(tabs)/settings': { path: '/(tabs)/settings', type: 'private', requireAuth: true },

  // Rotas de pacientes
  '/patient/[id]': { path: '/patient/[id]', type: 'private', requireAuth: true },
  '/patient/[id]/evolution': { path: '/patient/[id]/evolution', type: 'private', requireAuth: true },
  '/patient/[id]/financial': { path: '/patient/[id]/financial', type: 'private', requireAuth: true },
  '/patient/[id]/protocols': { path: '/patient/[id]/protocols', type: 'private', requireAuth: true },

  // Rotas de configurações (role-based)
  '/(settings)/audit-log': {
    path: '/(settings)/audit-log',
    type: 'role-based',
    allowedRoles: ['admin', 'professional', 'fisioterapeuta'],
    redirectTo: '/',
  },
  '/(settings)/team': {
    path: '/(settings)/team',
    type: 'role-based',
    allowedRoles: ['admin', 'professional'],
    redirectTo: '/',
  },
};

/**
 * Verifica se um usuário tem permissão para acessar uma rota
 */
export function hasRouteAccess(
  user: { role: UserRole } | null,
  routeConfig: RouteConfig
): boolean {
  // Se é pública, todos têm acesso
  if (routeConfig.type === 'public') {
    return true;
  }

  // Se requer autenticação e usuário não está logado
  if (routeConfig.requireAuth && !user) {
    return false;
  }

  // Se é baseada em roles, verifica se o usuário tem uma das roles permitidas
  if (routeConfig.type === 'role-based' && routeConfig.allowedRoles) {
    if (!user) {
      return false;
    }
    return routeConfig.allowedRoles.includes(user.role);
  }

  // Se é privada e usuário está logado
  if (routeConfig.type === 'private' && user) {
    return true;
  }

  return false;
}

/**
 * Obtém a rota de redirecionamento para um usuário
 */
export function getRedirectForUser(user: { role: UserRole } | null): string {
  if (!user) {
    return '/(auth)/login';
  }

  // Redirecionamento baseado no role
  switch (user.role) {
    case 'patient':
      return '/(tabs)/home'; // Se houver tela de pacientes
    case 'professional':
    case 'fisioterapeuta':
    case 'admin':
      return '/(tabs)/patients';
    default:
      return '/';
  }
}

/**
 * Hook para usar guards de navegação
 */
export function useNavigationGuard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  /**
   * Navega para uma rota protegida
   */
  const navigateProtected = (path: string) => {
    const routeConfig = PROTECTED_ROUTES[path];

    if (!routeConfig) {
      router.push(path);
      return;
    }

    // Verifica permissão
    if (hasRouteAccess(user || null, routeConfig)) {
      router.push(path);
    } else {
      // Redireciona para a rota apropriada
      const redirect = routeConfig.redirectTo || getRedirectForUser(user);
      router.replace(redirect as any);
    }
  };

  /**
   * Verifica se uma rota requer autenticação
   */
  const requiresAuth = (path: string): boolean => {
    const routeConfig = PROTECTED_ROUTES[path];
    return routeConfig?.requireAuth || false;
  };

  /**
   * Verifica se um usuário tem acesso a uma rota
   */
  const canAccess = (path: string): boolean => {
    const routeConfig = PROTECTED_ROUTES[path];
    if (!routeConfig) return true;
    return hasRouteAccess(user || null, routeConfig);
  };

  /**
   * Redireciona para a rota apropriada baseado no estado de autenticação
   */
  const redirectBasedOnAuth = (fallback: string = '/') => {
    if (isAuthenticated) {
      router.replace(fallback as any);
    } else {
      router.replace('/(auth)/login' as any);
    }
  };

  return {
    navigateProtected,
    requiresAuth,
    canAccess,
    redirectBasedOnAuth,
    user,
    isAuthenticated,
  };
}

/**
 * Hook para verificar permissões de rota
 */
export function useRoutePermissions() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  /**
   * Verifica permissão para uma rota específica
   */
  const checkPermission = (path: string): {
    allowed: boolean;
    reason?: string;
    redirectTo?: string;
  } => {
    const routeConfig = PROTECTED_ROUTES[path];

    if (!routeConfig) {
      return { allowed: true };
    }

    if (!isAuthenticated && routeConfig.type !== 'public') {
      return {
        allowed: false,
        reason: 'Autenticação requerida',
        redirectTo: '/(auth)/login',
      };
    }

    if (routeConfig.type === 'role-based' && routeConfig.allowedRoles) {
      if (!user || !routeConfig.allowedRoles.includes(user.role)) {
        return {
          allowed: false,
          reason: 'Permissão insuficiente',
          redirectTo: routeConfig.redirectTo || '/',
        };
      }
    }

    return { allowed: true };
  };

  /**
   * Redireciona se não tiver permissão
   */
  const requirePermission = (path: string): boolean => {
    const { allowed, redirectTo } = checkPermission(path);

    if (!allowed && redirectTo) {
      router.replace(redirectTo as any);
      return false;
    }

    return allowed;
  };

  /**
   * Verifica se tem uma role específica
   */
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    return rolesToCheck.includes(user.role);
  };

  return {
    checkPermission,
    requirePermission,
    hasRole,
    user,
    isAuthenticated,
  };
}

/**
 * Hook para proteger componentes baseado em roles
 */
export function useRoleAccess(requiredRoles: UserRole | UserRole[]) {
  const { user, isAuthenticated } = useAuthStore();

  const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  const hasAccess = isAuthenticated && user && rolesToCheck.includes(user.role);

  const currentRole = user?.role || null;

  return {
    hasAccess,
    currentRole,
    user,
    isAuthenticated,
  };
}

/**
 * HOC para proteger componentes baseado em roles
 */
export function withRoleAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRoles: UserRole | UserRole[],
  FallbackComponent?: React.ComponentType
) {
  return function RoleProtectedComponent(props: P) {
    const { hasAccess, currentRole } = useRoleAccess(requiredRoles);

    if (!hasAccess) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * HOC para proteger componentes que requerem autenticação
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType
) {
  return function AuthProtectedComponent(props: P) {
    const { isAuthenticated } = useAuthStore();
    const router = useRouter();

    React.useEffect(() => {
      if (!isAuthenticated) {
        router.replace('/(auth)/login' as any);
      }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Verifica permissão para uma ação específica
 */
export function hasActionPermission(
  user: { role: UserRole } | null,
  action: string
): boolean {
  if (!user) return false;

  const actionPermissions: Record<UserRole, string[]> = {
    patient: [],
    professional: ['view', 'create', 'update'],
    fisioterapeuta: ['view', 'create', 'update'],
    admin: ['view', 'create', 'update', 'delete'],
  };

  return actionPermissions[user.role]?.includes(action) || false;
}

/**
 * Hook para verificar permissões de ação
 */
export function useActionPermission() {
  const { user } = useAuthStore();

  const can = (action: string): boolean => {
    return hasActionPermission(user, action);
  };

  const canView = can('view');
  const canCreate = can('create');
  const canUpdate = can('update');
  const canDelete = can('delete');

  return {
    can,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    user,
  };
}

/**
 * Configuração de permissões por rota (para uso em componentes)
 */
export const ROUTE_PERMISSIONS = {
  // Pacientes
  viewPatient: { action: 'view', resource: 'patient' },
  createPatient: { action: 'create', resource: 'patient' },
  updatePatient: { action: 'update', resource: 'patient' },
  deletePatient: { action: 'delete', resource: 'patient' },

  // Evoluções
  viewEvolution: { action: 'view', resource: 'evolution' },
  createEvolution: { action: 'create', resource: 'evolution' },
  updateEvolution: { action: 'update', resource: 'evolution' },

  // Protocolos
  viewProtocol: { action: 'view', resource: 'protocol' },
  createProtocol: { action: 'create', resource: 'protocol' },
  updateProtocol: { action: 'update', resource: 'protocol' },
  deleteProtocol: { action: 'delete', resource: 'protocol' },
};
