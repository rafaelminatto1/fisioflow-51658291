import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePermissions, useRouteProtection } from '@/hooks/usePermissions';
import type { UserRole, RolePermissions } from '@/types/agenda';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: (keyof RolePermissions)[];
  requiredRoles?: UserRole[];
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
}

/**
 * Component that protects routes based on permissions and roles
 */
export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallbackPath = '/unauthorized',
  loadingComponent
}: ProtectedRouteProps) {
  const location = useLocation();
  const {
    isAuthenticated,
    userRole,
    hasPermission,
    canAccessRoute,
    redirectToAuthorized
  } = usePermissions();

  // Show loading if still checking authentication
  if (loadingComponent && !isAuthenticated) {
    return <>{loadingComponent}</>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check route access
  if (!canAccessRoute(location.pathname)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check required permissions
  for (const permission of requiredPermissions) {
    if (!hasPermission(permission)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check required roles
  if (requiredRoles.length > 0 && userRole) {
    if (!requiredRoles.includes(userRole)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <>{children}</>;
}

/**
 * Default loading component
 */
export function RouteLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Verificando permissões...</span>
      </div>
    </div>
  );
}

/**
 * Component for unauthorized access page
 */
export function UnauthorizedPage() {
  const { userRole, redirectToAuthorized } = usePermissions();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">🚫</div>
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
        {userRole && (
          <p className="text-sm text-muted-foreground">
            Seu perfil atual: <strong>{userRole}</strong>
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={redirectToAuthorized}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Ir para Página Inicial
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-input rounded-md hover:bg-accent"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Higher-order component for route protection
 */
export function withRouteProtection<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    requiredPermissions?: (keyof RolePermissions)[];
    requiredRoles?: UserRole[];
    fallbackPath?: string;
  } = {}
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute
        requiredPermissions={options.requiredPermissions}
        requiredRoles={options.requiredRoles}
        fallbackPath={options.fallbackPath}
        loadingComponent={<RouteLoadingSpinner />}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Hook for programmatic route protection
 */
export function useRouteGuard(
  requiredPermissions: (keyof RolePermissions)[] = [],
  requiredRoles: UserRole[] = []
) {
  const { hasPermission, userRole, isAuthenticated } = usePermissions();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login will be handled by ProtectedRoute
      return;
    }

    // Check permissions
    for (const permission of requiredPermissions) {
      if (!hasPermission(permission)) {
        console.warn(`Missing permission: ${permission} for route: ${location.pathname}`);
        return;
      }
    }

    // Check roles
    if (requiredRoles.length > 0 && userRole) {
      if (!requiredRoles.includes(userRole)) {
        console.warn(`Insufficient role: ${userRole} for route: ${location.pathname}`);
        return;
      }
    }
  }, [isAuthenticated, hasPermission, userRole, location.pathname, requiredPermissions, requiredRoles]);

  return {
    isAuthorized: isAuthenticated && 
      requiredPermissions.every(permission => hasPermission(permission)) &&
      (requiredRoles.length === 0 || (userRole && requiredRoles.includes(userRole))),
    userRole,
    isAuthenticated
  };
}

/**
 * Component that shows different navigation based on user role
 */
export function RoleBasedNavigation() {
  const { userRole, isStaff } = usePermissions();

  const getNavigationItems = () => {
    const baseItems = [
      { path: '/', label: 'Início' }
    ];

    if (isStaff) {
      baseItems.push(
        { path: '/agenda', label: 'Agenda' },
        { path: '/patients', label: 'Pacientes' }
      );
    }

    switch (userRole) {
      case 'admin':
        return [
          ...baseItems,
          { path: '/payments', label: 'Pagamentos' },
          { path: '/analytics', label: 'Relatórios' },
          { path: '/settings', label: 'Configurações' }
        ];
      
      case 'therapist':
        return [
          ...baseItems,
          { path: '/payments', label: 'Pagamentos' },
          { path: '/analytics', label: 'Relatórios' }
        ];
      
      case 'intern':
        return baseItems;
      
      case 'patient':
        return [
          { path: '/patient-portal', label: 'Meu Portal' },
          { path: '/patient-portal/appointments', label: 'Meus Agendamentos' },
          { path: '/patient-portal/exercises', label: 'Meus Exercícios' }
        ];
      
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <nav className="space-y-1">
      {navigationItems.map((item) => (
        <a
          key={item.path}
          href={item.path}
          className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}