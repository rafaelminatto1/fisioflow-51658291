import { useState, useEffect, useCallback } from 'react';
import {
  getBiometricStatus,
  authenticateBiometric,
  setBiometricEnabled,
  isBiometricEnabled as checkBiometricEnabled,
  getBiometricTypeName,
} from '@/lib/biometrics';

export interface BiometricAuthState {
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: 'face' | 'fingerprint' | 'none';
  biometricTypeName: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para autenticação biométrica (Face ID / Touch ID)
 *
 * Uso:
 * ```tsx
 * const { authenticate, enable, disable, isAvailable, isEnabled, biometricTypeName } = useBiometricAuth();
 *
 * // Para autenticar
 * const success = await authenticate();
 *
 * // Para habilitar biometria após login bem-sucedido
 * await enable();
 * ```
 */
export function useBiometricAuth() {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isEnabled: false,
    biometricType: 'none',
    biometricTypeName: '',
    isLoading: true,
    error: null,
  });

  // Check biometric availability on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const status = await getBiometricStatus();

      // Check if enabled in storage
      const enabled = await checkBiometricEnabled();

      setState({
        isAvailable: status.isAvailable && status.isEnrolled,
        isEnabled: enabled,
        biometricType: status.biometricType,
        biometricTypeName: getBiometricTypeName(status.biometricType),
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      setState({
        isAvailable: false,
        isEnabled: false,
        biometricType: 'none',
        biometricTypeName: '',
        isLoading: false,
        error: error.message || 'Erro ao verificar biometria',
      });
    }
  };

  const authenticate = useCallback(async (reason?: string): Promise<boolean> => {
    if (!state.isAvailable) {
      return false;
    }

    setState((prev) => ({ ...prev, error: null }));

    try {
      const success = await authenticateBiometric(reason);

      if (!success) {
        setState((prev) => ({
          ...prev,
          error: 'Autenticação biométrica falhou ou foi cancelada',
        }));
      }

      return success;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Erro na autenticação biométrica',
      }));
      return false;
    }
  }, [state.isAvailable]);

  const enable = useCallback(async () => {
    try {
      await setBiometricEnabled(true);
      setState((prev) => ({ ...prev, isEnabled: true }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Erro ao habilitar biometria',
      }));
    }
  }, []);

  const disable = useCallback(async () => {
    try {
      await setBiometricEnabled(false);
      setState((prev) => ({ ...prev, isEnabled: false }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Erro ao desabilitar biometria',
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    authenticate,
    enable,
    disable,
    clearError,
    checkAvailability,
  };
}
