/**
 * withBiometricProtection HOC
 *
 * Higher-Order Component que envolve telas para exigir autenticação biométrica
 * antes de mostrar o conteúdo. Útil para telas com dados sensíveis.
 */

import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { BiometricLockScreen } from './BiometricLockScreen';
import { Button } from './Button';
import { addBreadcrumb } from '@/lib/sentry';

interface WithBiometricProtectionProps {
  isRequired?: boolean;
  reauthTimeout?: number; // ms, 5 minutos padrão
}

/**
 * Configurações padrão
 */
const DEFAULT_REAUTH_TIMEOUT = 5 * 60 * 1000; // 5 minutos

interface ProtectedScreenState {
  isLocked: boolean;
  lastAuthTime: number | null;
}

/**
 * Estado global para tela de bloqueio (compartilhado entre telas)
 */
let globalProtectedState: ProtectedScreenState = {
  isLocked: false,
  lastAuthTime: null,
};

/**
 * Reinicia o estado de proteção (chamar no logout)
 */
export function resetBiometricProtection() {
  globalProtectedState = {
    isLocked: false,
    lastAuthTime: null,
  };
}

/**
 * Desbloqueia temporariamente a proteção biométrica
 */
export function setBiometricUnlocked(until?: number) {
  globalProtectedState.isLocked = false;
  globalProtectedState.lastAuthTime = until || Date.now();
}

/**
 * Verifica se a proteção está bloqueada
 */
export function isBiometricLocked(timeout: number = DEFAULT_REAUTH_TIMEOUT): boolean {
  if (!globalProtectedState.lastAuthTime) {
    return false;
  }
  return Date.now() - globalProtectedState.lastAuthTime > timeout;
}

/**
 * HOC para proteger componentes com autenticação biométrica
 *
 * @usage
 * ```tsx
 * const ProtectedPatientData = withBiometricProtection(PatientDataScreen, {
 *   isRequired: true,
 *   reauthTimeout: 2 * 60 * 1000, // 2 minutos
 * });
 * ```
 */
export function withBiometricProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithBiometricProtectionProps = {}
) {
  const {
    isRequired = true,
    reauthTimeout = DEFAULT_REAUTH_TIMEOUT,
  } = options;

  return function BiometricProtectedComponent(props: P) {
    const { isEnabled, isAvailable, authenticate } = useBiometricAuth();
    const [isLocked, setIsLocked] = useState(false);
    const [showLockScreen, setShowLockScreen] = useState(false);

    useEffect(() => {
      // Se biometria não está habilitada ou disponível, não protege
      if (!isRequired || !isEnabled || !isAvailable) {
        return;
      }

      // Verifica se precisa reautenticar
      const needsAuth = isBiometricLocked(reauthTimeout);

      if (needsAuth && !showLockScreen) {
        setShowLockScreen(true);
        setIsLocked(true);
        addBreadcrumb({
          category: 'auth',
          message: 'Biometric protection triggered',
          level: 'info',
        });
      }
    }, [isRequired, isEnabled, isAvailable, reauthTimeout]);

    // Se não precisa de proteção ou não está habilitado, mostra o componente diretamente
    if (!isRequired || !isEnabled || !isAvailable) {
      return <WrappedComponent {...props} />;
    }

    // Mostra tela de bloqueio
    if (showLockScreen) {
      return (
        <BiometricLockScreen
          onUnlock={() => {
            setBiometricUnlocked();
            setShowLockScreen(false);
            setIsLocked(false);
          }}
          onUsePassword={() => {
            // Fallback - remove proteção temporariamente
            setBiometricUnlocked();
            setShowLockScreen(false);
            setIsLocked(false);
          }}
        />
      );
    }

    // Mostra o componente normalmente
    return <WrappedComponent {...props} />;
  };
}

/**
 * Componente de botão que ativa autenticação biométrica antes de executar uma ação
 */
interface BiometricButtonProps {
  children: React.ReactNode;
  onPress: () => void | Promise<void>;
  reason?: string;
  disabled?: boolean;
}

export function BiometricButton({
  children,
  onPress,
  reason = 'Autentique-se para continuar',
  disabled = false,
}: BiometricButtonProps) {
  const { authenticate, isEnabled, isAvailable } = useBiometricAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handlePress = async () => {
    // Se biometria não está habilitada, executa a ação diretamente
    if (!isEnabled || !isAvailable) {
      await onPress();
      return;
    }

    setIsAuthenticating(true);

    try {
      const success = await authenticate(reason);

      if (success) {
        await onPress();
      }
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Button
      title={typeof children === 'string' ? children : 'Continuar'}
      onPress={handlePress}
      disabled={disabled || isAuthenticating}
      loading={isAuthenticating}
    >
      {children}
    </Button>
  );
}

/**
 * Hook para usar proteção biométrica dentro de componentes
 */
export function useBiometricProtection(timeout: number = DEFAULT_REAUTH_TIMEOUT) {
  const { isEnabled, isAvailable, authenticate } = useBiometricAuth();

  const needsAuth = isEnabled && isAvailable && isBiometricLocked(timeout);

  const authenticateIfNeeded = async (reason?: string): Promise<boolean> => {
    if (!isEnabled || !isAvailable) {
      return true;
    }

    if (!isBiometricLocked(timeout)) {
      return true;
    }

    const success = await authenticate(reason || 'Autentique-se para continuar');
    if (success) {
      setBiometricUnlocked();
    }
    return success;
  };

  return {
    isProtected: isEnabled && isAvailable,
    needsAuth,
    authenticateIfNeeded,
  };
}
