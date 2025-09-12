import React from 'react';
import { AlertTriangle, Lock, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions, useConditionalRender } from '@/hooks/usePermissions';
import type { UserRole, RolePermissions } from '@/types/agenda';

interface PermissionGuardProps {
  permission?: keyof RolePermissions;
  roles?: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
}

/**
 * Component that conditionally renders children based on permissions
 */
export function PermissionGuard({
  permission,
  roles,
  children,
  fallback,
  showError = true
}: PermissionGuardProps) {
  const { hasPermission, userRole, isAuthenticated } = usePermissions();

  // Check authentication first
  if (!isAuthenticated) {
    return fallback || (showError ? <UnauthorizedMessage /> : null);
  }

  // Check permission if specified
  if (permission && !hasPermission(permission)) {
    return fallback || (showError ? <InsufficientPermissionMessage permission={permission} /> : null);
  }

  // Check roles if specified
  if (roles && userRole) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(userRole)) {
      return fallback || (showError ? <InsufficientRoleMessage requiredRoles={allowedRoles} /> : null);
    }
  }

  return <>{children}</>;
}

/**
 * Component for displaying unauthorized access message
 */
function UnauthorizedMessage() {
  const { redirectToAuthorized } = usePermissions();

  return (
    <Alert variant="destructive" className="max-w-md mx-auto">
      <Lock className="h-4 w-4" />
      <AlertTitle>Acesso Negado</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>Você precisa estar logado para acessar esta funcionalidade.</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={redirectToAuthorized}
          className="mt-2"
        >
          Fazer Login
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Component for displaying insufficient permission message
 */
function InsufficientPermissionMessage({ permission }: { permission: keyof RolePermissions }) {
  const permissionLabels: Record<keyof RolePermissions, string> = {
    canCreateAppointment: 'criar agendamentos',
    canEditAppointment: 'editar agendamentos',
    canDeleteAppointment: 'excluir agendamentos',
    canViewAllAppointments: 'visualizar todos os agendamentos',
    canManagePayments: 'gerenciar pagamentos',
    canAccessFinancialData: 'acessar dados financeiros',
    canMarkSessionStatus: 'marcar status das sessões',
    canAccessEvolutions: 'acessar evoluções',
  };

  return (
    <Alert variant="destructive" className="max-w-md mx-auto">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Permissão Insuficiente</AlertTitle>
      <AlertDescription>
        Você não tem permissão para {permissionLabels[permission] || permission}.
        Entre em contato com o administrador se precisar de acesso.
      </AlertDescription>
    </Alert>
  );
}

/**
 * Component for displaying insufficient role message
 */
function InsufficientRoleMessage({ requiredRoles }: { requiredRoles: UserRole[] }) {
  const roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    therapist: 'Fisioterapeuta',
    intern: 'Estagiário',
    patient: 'Paciente',
  };

  const roleNames = requiredRoles.map(role => roleLabels[role]).join(', ');

  return (
    <Alert variant="destructive" className="max-w-md mx-auto">
      <User className="h-4 w-4" />
      <AlertTitle>Acesso Restrito</AlertTitle>
      <AlertDescription>
        Esta funcionalidade é restrita aos seguintes perfis: {roleNames}.
      </AlertDescription>
    </Alert>
  );
}

/**
 * Component that shows different content based on user role
 */
interface RoleBasedContentProps {
  adminContent?: React.ReactNode;
  therapistContent?: React.ReactNode;
  internContent?: React.ReactNode;
  patientContent?: React.ReactNode;
  staffContent?: React.ReactNode; // For admin, therapist, intern
  fallback?: React.ReactNode;
}

export function RoleBasedContent({
  adminContent,
  therapistContent,
  internContent,
  patientContent,
  staffContent,
  fallback
}: RoleBasedContentProps) {
  const { userRole, isStaff } = usePermissions();

  // Show staff content if available and user is staff
  if (staffContent && isStaff) {
    return <>{staffContent}</>;
  }

  // Show role-specific content
  switch (userRole) {
    case 'admin':
      return <>{adminContent || fallback}</>;
    case 'therapist':
      return <>{therapistContent || fallback}</>;
    case 'intern':
      return <>{internContent || fallback}</>;
    case 'patient':
      return <>{patientContent || fallback}</>;
    default:
      return <>{fallback}</>;
  }
}

/**
 * Component that displays user permissions info
 */
export function UserPermissionsInfo() {
  const permissions = usePermissions();

  if (!permissions.isAuthenticated) {
    return null;
  }

  const permissionList: Array<{ key: keyof RolePermissions; label: string }> = [
    { key: 'canCreateAppointment', label: 'Criar Agendamentos' },
    { key: 'canEditAppointment', label: 'Editar Agendamentos' },
    { key: 'canDeleteAppointment', label: 'Excluir Agendamentos' },
    { key: 'canViewAllAppointments', label: 'Ver Todos os Agendamentos' },
    { key: 'canManagePayments', label: 'Gerenciar Pagamentos' },
    { key: 'canAccessFinancialData', label: 'Acessar Dados Financeiros' },
    { key: 'canMarkSessionStatus', label: 'Marcar Status das Sessões' },
    { key: 'canAccessEvolutions', label: 'Acessar Evoluções' },
  ];

  const roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    therapist: 'Fisioterapeuta',
    intern: 'Estagiário',
    patient: 'Paciente',
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Suas Permissões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-sm font-medium">Perfil: </span>
          <span className="text-sm">
            {permissions.userRole ? roleLabels[permissions.userRole] : 'Não definido'}
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Permissões:</span>
          <div className="space-y-1">
            {permissionList.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className={permissions.hasPermission(key) ? 'text-green-600' : 'text-red-600'}>
                  {permissions.hasPermission(key) ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook-based component for conditional rendering
 */
export function ConditionalRender() {
  const { renderIfPermission, renderIfRole, renderIfStaff } = useConditionalRender();

  return (
    <div className="space-y-4">
      {renderIfPermission(
        'canCreateAppointment',
        <Button>Criar Agendamento</Button>,
        <p className="text-muted-foreground text-sm">Você não pode criar agendamentos</p>
      )}

      {renderIfRole(
        ['admin', 'therapist'],
        <Button variant="outline">Gerenciar Pacientes</Button>
      )}

      {renderIfStaff(
        <Button variant="secondary">Área da Equipe</Button>,
        <p className="text-muted-foreground text-sm">Acesso restrito à equipe</p>
      )}
    </div>
  );
}