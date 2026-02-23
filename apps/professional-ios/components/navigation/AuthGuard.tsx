import { React, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Se true, permite acesso apenas se usuário tiver biometria configurada */
  requiresBiometrics?: boolean;
}

/**
 * AuthGuard - Componente de proteção de rotas sensíveis
 *
 * Verifica se o usuário está autenticado antes de renderizar o conteúdo.
 * Se não autenticado, redireciona para a tela de login.
 *
 * Uso:
 * ```tsx
 * <AuthGuard requiresBiometrics={true}>
 *   <Stack.Screen name="agenda" />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({ children, requiresBiometrics = false }: AuthGuardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBiometricSetup = useAuthStore((state) => state.biometricEnabled);

  useEffect(() => {
    // Se não autenticado, redirecionar para login
    if (!isAuthenticated) {
      console.log('[AuthGuard] Usuário não autenticado, redirecionando para login');
      router.replace('/(auth)/login');
      return;
    }

    // Verifica biometria se necessário
    if (requiresBiometrics && !isBiometricSetup) {
      console.log('[AuthGuard] Biometria não configurada, redirecionando para setup');
      router.replace('/(auth)/biometric-setup');
      return;
    }
  }, [isAuthenticated, isBiometricSetup, requiresBiometrics, router]);

  // Se ainda não passou na verificação, não renderiza nada (evita flash)
  if (!isAuthenticated || (requiresBiometrics && !isBiometricSetup)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook para determinar se a rota atual requer autenticação
 * Útil para configurar headers/tabs dinamicamente
 */
export function useRequireAuth(requireBiometrics = false) {
  return { requiresBiometrics };
}
