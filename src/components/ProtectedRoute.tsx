import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireProfile?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireProfile = true,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { user, profile, loading, initialized, sessionCheckFailed, role, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Only redirect if auth is fully initialized
    if (initialized && !loading && !user && !sessionCheckFailed) {
      // Save current location to redirect back after login
      navigate(redirectTo, { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [user, loading, initialized, sessionCheckFailed, navigate, redirectTo, location.pathname]);

  // Show loading state while authentication is initializing
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            {!initialized ? 'Inicializando...' : 'Verificando autenticação...'}
          </p>
        </div>
      </div>
    );
  }

  // Handle session check failure
  if (sessionCheckFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Falha ao verificar a sessão. Verifique sua conexão com a internet.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    return null; // Will be redirected by useEffect
  }

  // Check if profile is required but missing
  if (requireProfile && !profile) {
    const handleRetry = async () => {
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        await refreshProfile();
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {retryCount < 3 
                ? 'Carregando perfil do usuário...'
                : 'Não foi possível carregar seu perfil. Tente recarregar a página.'
              }
            </AlertDescription>
          </Alert>
          {retryCount < 3 ? (
            <Button onClick={handleRetry} className="mt-4" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          ) : (
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Recarregar página
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Check role-based access
  if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você não tem permissão para acessar esta página.
              <br />
              <span className="text-sm mt-2 block">
                Página restrita para: {allowedRoles.join(', ')}
              </span>
              <span className="text-sm">
                Seu perfil: {role}
              </span>
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate('/')}
            className="mt-4"
            variant="outline"
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  // All checks passed, render protected content
  return <>{children}</>;
}

// Convenience components for specific protection levels
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      {children}
    </ProtectedRoute>
  );
}

export function ProfessionalRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'fisioterapeuta', 'estagiario']}>
      {children}
    </ProtectedRoute>
  );
}

export function TherapistRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['fisioterapeuta', 'estagiario']}>
      {children}
    </ProtectedRoute>
  );
}

export function PatientRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['paciente']}>
      {children}
    </ProtectedRoute>
  );
}

export function PartnerRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['parceiro']}>
      {children}
    </ProtectedRoute>
  );
}