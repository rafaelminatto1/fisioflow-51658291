import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/errors/logger';

export interface BiometricAuthState {
  isAvailable: boolean;
  isAuthenticated: boolean;
  deviceType: 'faceId' | 'touchId' | 'none';
  authenticate: () => Promise<boolean>;
  checkAvailability: () => Promise<void>;
}

/**
 * Hook para autenticação biométrica (Face ID / Touch ID)
 * @returns Estado e funções para autenticação biométrica
 */
export function useBiometricAuth(): BiometricAuthState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deviceType, setDeviceType] = useState<'faceId' | 'touchId' | 'none'>('none');

  /**
   * Verifica se a autenticação biométrica está disponível no dispositivo
   */
  const checkAvailability = useCallback(async () => {
    try {
      const result = await NativeBiometric.isAvailable();

      if (result.isAvailable) {
        setIsAvailable(true);

        // Determinar tipo de biometria
        try {
          await NativeBiometric.verifyIdentity({
            reason: 'Verificar tipo de biometria',
            title: 'Configuração Biométrica',
          });
        } catch (error: unknown) {
          // Se falhar, ainda pode estar disponível, só não autenticou ainda
        }
      } else {
        setIsAvailable(false);
      }
    } catch (error) {
      logger.error('Erro ao verificar disponibilidade biométrica', error, 'useBiometricAuth');
      setIsAvailable(false);
    }
  }, []);

  /**
   * Realiza autenticação biométrica
   * @returns true se autenticou com sucesso, false caso contrário
   */
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      logger.warn('Biometria não disponível', undefined, 'useBiometricAuth');
      return false;
    }

    try {
      const result = await NativeBiometric.verifyIdentity({
        reason: 'Por favor, autentique para acessar o FisioFlow',
        title: 'Autenticação Biométrica',
        subtitle: 'Use Face ID ou Touch ID',
        description: 'Escaneie sua biometria para continuar',
      });

      if (result.success) {
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (error: unknown) {
      logger.error('Erro na autenticação biométrica', error, 'useBiometricAuth');

      // Tratamento de erros específicos
      if (error.code === 'USER_CANCELATION') {
        logger.info('Usuário cancelou autenticação', undefined, 'useBiometricAuth');
      } else if (error.code === 'BIOMETRIC_NOT_ENROLLED') {
        logger.info('Nenhuma biometria configurada no dispositivo', undefined, 'useBiometricAuth');
      } else if (error.code === 'APP_CANCELATION') {
        logger.info('App foi colocado em background', undefined, 'useBiometricAuth');
      }

      return false;
    }
  }, [isAvailable]);

  // Verificar disponibilidade ao montar o componente
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return {
    isAvailable,
    isAuthenticated,
    deviceType,
    authenticate,
    checkAvailability,
  };
}

/**
 * Configura credenciais biométricas para o app
 * Deve ser chamado após login bem-sucedido com email/senha
 */
export async function setBiometricCredentials(email: string, password: string): Promise<void> {
  try {
    await NativeBiometric.setCredentials({
      username: email,
      password: password,
      server: 'com.fisioflow.app',
    });
  } catch (error) {
    logger.error('Erro ao salvar credenciais biométricas', error, 'useBiometricAuth');
    throw error;
  }
}

/**
 * Remove credenciais biométricas salvas
 * Deve ser chamado ao fazer logout
 */
export async function deleteBiometricCredentials(): Promise<void> {
  try {
    await NativeBiometric.deleteCredentials({
      server: 'com.fisioflow.app',
    });
  } catch (error) {
    logger.error('Erro ao remover credenciais biométricas', error, 'useBiometricAuth');
  }
}

/**
 * Obtém credenciais salvas (se existirem)
 * @returns Credenciais ou null se não existirem
 */
export async function getBiometricCredentials(): Promise<{ username: string; password: string } | null> {
  try {
    const credentials = await NativeBiometric.getCredentials({
      server: 'com.fisioflow.app',
    });

    return credentials;
  } catch (error) {
    logger.error('Erro ao obter credenciais biométricas', error, 'useBiometricAuth');
    return null;
  }
}
