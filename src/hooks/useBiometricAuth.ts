import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { useCallback, useEffect, useState } from 'react';

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
        } catch (error: any) {
          // Se falhar, ainda pode estar disponível, só não autenticou ainda
        }
      } else {
        setIsAvailable(false);
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade biométrica:', error);
      setIsAvailable(false);
    }
  }, []);

  /**
   * Realiza autenticação biométrica
   * @returns true se autenticou com sucesso, false caso contrário
   */
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      console.warn('Biometria não disponível');
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
    } catch (error: any) {
      console.error('Erro na autenticação biométrica:', error);

      // Tratamento de erros específicos
      if (error.code === 'USER_CANCELATION') {
        console.log('Usuário cancelou autenticação');
      } else if (error.code === 'BIOMETRIC_NOT_ENROLLED') {
        console.log('Nenhuma biometria configurada no dispositivo');
      } else if (error.code === 'APP_CANCELATION') {
        console.log('App foi colocado em background');
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
    console.error('Erro ao salvar credenciais biométricas:', error);
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
    console.error('Erro ao remover credenciais biométricas:', error);
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
    console.error('Erro ao obter credenciais biométricas:', error);
    return null;
  }
}
