import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Shield, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useUsers';
import { usePermissions } from '@/hooks/usePermissions';

interface PatientAgendaGuardProps {
  children: React.ReactNode;
  requiredRole?: 'patient' | 'therapist' | 'admin';
  fallbackPath?: string;
}

export function PatientAgendaGuard({ 
  children, 
  requiredRole = 'patient',
  fallbackPath = '/dashboard' 
}: PatientAgendaGuardProps) {
  const { data: currentUser, isLoading } = useCurrentUser();
  const { hasRole, canViewPatientData } = usePermissions();
  const location = useLocation();

  // Redirect patients to their specific agenda view
  useEffect(() => {
    if (!isLoading && currentUser?.role === 'patient') {
      // If patient is trying to access general agenda, redirect to patient view
      if (location.pathname === '/agenda' || location.pathname === '/appointments') {
        // This would be handled by routing logic
      }
    }
  }, [currentUser, isLoading, location.pathname]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && !hasRole(requiredRole)) {
    return <UnauthorizedAccess userRole={currentUser.role} requiredRole={requiredRole} />;
  }

  // Additional checks for patient data access
  if (requiredRole === 'patient' && !canViewPatientData) {
    return <RestrictedAccess />;
  }

  return <>{children}</>;
}

// Loading state component
function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    </div>
  );
}

// Unauthorized access component
interface UnauthorizedAccessProps {
  userRole: string;
  requiredRole: string;
}

function UnauthorizedAccess({ userRole, requiredRole }: UnauthorizedAccessProps) {
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl">Acesso Não Autorizado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página. 
            Esta área é restrita para usuários com perfil de {getRoleLabel(requiredRole)}.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Seu perfil atual: {getRoleLabel(userRole)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleGoBack}>
              Voltar
            </Button>
            <Button onClick={handleGoHome}>
              Ir para Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Restricted access component
function RestrictedAccess() {
  const handleContactSupport = () => {
    // This would open a support modal or redirect to contact page
    console.log('Contact support');
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <User className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl">Acesso Restrito</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Sua conta não possui as permissões necessárias para visualizar dados de pacientes.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Entre em contato com o administrador do sistema para solicitar as permissões adequadas.
            </p>
          </div>

          <Button onClick={handleContactSupport} className="w-full">
            Entrar em Contato
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Patient-specific route guard
interface PatientRouteGuardProps {
  children: React.ReactNode;
  patientId?: string;
}

export function PatientRouteGuard({ children, patientId }: PatientRouteGuardProps) {
  const { data: currentUser } = useCurrentUser();
  const { canViewPatientData, canViewAllPatients } = usePermissions();

  // If user is a patient, they can only see their own data
  if (currentUser?.role === 'patient') {
    if (patientId && patientId !== currentUser.id) {
      return <UnauthorizedPatientAccess />;
    }
  }

  // If user is not a patient, check if they can view patient data
  if (currentUser?.role !== 'patient' && !canViewPatientData) {
    return <RestrictedAccess />;
  }

  // If trying to access specific patient data, check permissions
  if (patientId && !canViewAllPatients && currentUser?.id !== patientId) {
    return <UnauthorizedPatientAccess />;
  }

  return <>{children}</>;
}

// Unauthorized patient access component
function UnauthorizedPatientAccess() {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl">Dados Protegidos</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Você não tem permissão para visualizar os dados deste paciente.
            Por questões de privacidade, você só pode acessar seus próprios dados.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Esta restrição está em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </div>

          <Button onClick={() => window.location.href = '/agenda/patient'} className="w-full">
            Ver Meus Agendamentos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Auto-redirect component for patients
export function PatientAutoRedirect() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && currentUser?.role === 'patient') {
      // Redirect patients from general agenda to patient-specific view
      const restrictedPaths = ['/agenda', '/appointments', '/schedule'];
      
      if (restrictedPaths.includes(location.pathname)) {
        window.location.href = '/agenda/patient';
      }
    }
  }, [currentUser, isLoading, location.pathname]);

  if (isLoading) {
    return <LoadingState />;
  }

  // If patient is on a restricted path, show redirect message
  if (currentUser?.role === 'patient') {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">
              Redirecionando para sua área de paciente...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// Utility function to get role labels
function getRoleLabel(role: string): string {
  const labels = {
    patient: 'Paciente',
    therapist: 'Fisioterapeuta',
    intern: 'Estagiário',
    admin: 'Administrador'
  };
  return labels[role as keyof typeof labels] || role;
}

// Hook for patient-specific permissions
export function usePatientPermissions(patientId?: string) {
  const { data: currentUser } = useCurrentUser();
  const { canViewPatientData, canViewAllPatients, canEditPatientData } = usePermissions();

  const canViewThisPatient = React.useMemo(() => {
    if (!currentUser) return false;
    
    // Patients can only view their own data
    if (currentUser.role === 'patient') {
      return !patientId || patientId === currentUser.id;
    }
    
    // Other roles need appropriate permissions
    if (!canViewPatientData) return false;
    
    // If specific patient ID is provided, check if user can view all patients
    if (patientId && !canViewAllPatients && currentUser.id !== patientId) {
      return false;
    }
    
    return true;
  }, [currentUser, patientId, canViewPatientData, canViewAllPatients]);

  const canEditThisPatient = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'patient') return false;
    
    return canEditPatientData && canViewThisPatient;
  }, [currentUser, canEditPatientData, canViewThisPatient]);

  return {
    canViewThisPatient,
    canEditThisPatient,
    isOwnData: currentUser?.id === patientId,
    userRole: currentUser?.role
  };
}