import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertTriangle } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  showError?: boolean;
}

/**
 * Component to protect routes based on user roles
 * 
 * @param allowedRoles - Array of roles that can access the content
 * @param children - Content to show if user has permission
 * @param fallback - Custom content to show when access is denied
 * @param redirectTo - URL to redirect when access is denied (overrides fallback)
 * @param showError - Whether to show error message for unauthorized access
 */
export function RoleGuard({ 
  allowedRoles, 
  children, 
  fallback,
  redirectTo,
  showError = true 
}: RoleGuardProps) {
  const { user, profile, loading, role } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // User doesn't have a profile yet
  if (!profile || !role) {
    return (
      <div className="flex items-center justify-center p-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Perfil não encontrado. Por favor, complete seu cadastro.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if user has required role
  const hasPermission = allowedRoles.includes(role);

  if (!hasPermission) {
    // Redirect if specified
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Show custom fallback
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show default error message
    if (showError) {
      return (
        <div className="flex items-center justify-center p-8">
          <Alert variant="destructive" className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Você não tem permissão para acessar esta página. 
              Esta área é restrita para: {allowedRoles.join(', ')}.
              Seu perfil atual: {role}.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    // Return nothing if showError is false
    return null;
  }

  // User has permission, render children
  return <>{children}</>;
}

// Convenience components for common role combinations
export function AdminOnly({ children, ...props }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['admin']} {...props}>
      {children}
    </RoleGuard>
  );
}

export function ProfessionalsOnly({ children, ...props }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['admin', 'fisioterapeuta', 'estagiario']} {...props}>
      {children}
    </RoleGuard>
  );
}

export function TherapistsOnly({ children, ...props }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['fisioterapeuta', 'estagiario']} {...props}>
      {children}
    </RoleGuard>
  );
}

export function PatientsOnly({ children, ...props }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['paciente']} {...props}>
      {children}
    </RoleGuard>
  );
}

export function PartnersOnly({ children, ...props }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['parceiro']} {...props}>
      {children}
    </RoleGuard>
  );
}