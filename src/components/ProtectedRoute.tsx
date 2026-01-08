import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AppLoadingSkeleton } from '@/components/ui/AppLoadingSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireProfile?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireProfile = false,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { user, profile, loading, initialized, sessionCheckFailed, role, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [retryCount, setRetryCount] = useState(0);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [profileLoadTimeout, setProfileLoadTimeout] = useState(false);

  useEffect(() => {
    // Only redirect if auth is fully initialized
    if (initialized && !loading && !user && !sessionCheckFailed) {
      navigate(redirectTo, { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [user, loading, initialized, sessionCheckFailed, navigate, redirectTo, location.pathname]);

  // Timeout for profile loading - 2 seconds max
  useEffect(() => {
    if (requireProfile && user && !profile && !profileLoadTimeout) {
      profileTimeoutRef.current = setTimeout(() => {
        setProfileLoadTimeout(true);
      }, 2000);
    }
    
    if (profile && profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
    }
    
    return () => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
      }
    };
  }, [user, profile, requireProfile, profileLoadTimeout]);

  // Show optimized loading skeleton
  if (!initialized || loading) {
    return <AppLoadingSkeleton message={!initialized ? 'Iniciando' : 'Verificando'} />;
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

  // Check if profile is required but missing (only block if timeout hasn't passed)
  if (requireProfile && !profile && !profileLoadTimeout) {
    const handleRetry = async () => {
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        await refreshProfile();
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando perfil...</p>
          {retryCount > 0 && (
            <Button onClick={handleRetry} className="mt-4" variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Check role-based access (only if profile exists and roles are specified)
  if (allowedRoles.length > 0 && profile && role && !allowedRoles.includes(role)) {
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