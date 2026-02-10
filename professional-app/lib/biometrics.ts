import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@fisioflow_biometric_enabled';
const BIOMETRIC_LAST_USED_KEY = '@fisioflow_biometric_last_used';

export interface BiometricStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: 'face' | 'fingerprint' | 'none';
  isEnabled: boolean;
}

/**
 * Verifica se o dispositivo suporta autenticação biométrica
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return {
        isAvailable: false,
        isEnrolled: false,
        biometricType: 'none',
        isEnabled: false,
      };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const isEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';

    // Determine biometric type
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    let biometricType: 'face' | 'fingerprint' | 'none' = 'none';

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'face';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    }

    return {
      isAvailable: true,
      isEnrolled: enrolled,
      biometricType,
      isEnabled,
    };
  } catch (error) {
    console.error('Error checking biometric status:', error);
    return {
      isAvailable: false,
      isEnrolled: false,
      biometricType: 'none',
      isEnabled: false,
    };
  }
}

/**
 * Realiza autenticação biométrica
 * @param reason Mensagem mostrada ao usuário
 * @returns true se autenticou com sucesso
 */
export async function authenticateBiometric(
  reason: string = 'Autentique para acessar o FisioFlow'
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Usar senha',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

    if (result.success) {
      // Save last successful use
      await AsyncStorage.setItem(BIOMETRIC_LAST_USED_KEY, new Date().toISOString());
      return true;
    }

    return false;
  } catch (error: any) {
    // User cancelled or authentication failed
    if (error?.code === 'user_cancel') {
      console.log('Biometric authentication cancelled by user');
    } else if (error?.code === 'not_enrolled') {
      console.log('No biometrics enrolled');
    } else if (error?.code === 'lockout') {
      console.log('Biometric lockout - too many attempts');
    } else {
      console.error('Biometric authentication error:', error);
    }
    return false;
  }
}

/**
 * Habilita ou desabilita login biométrico
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Verifica se o login biométrico está habilitado
 */
export async function isBiometricEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY)) === 'true';
}

/**
 * Obtém a última vez que a biometria foi usada com sucesso
 */
export async function getLastBiometricUse(): Promise<Date | null> {
  try {
    const lastUsed = await AsyncStorage.getItem(BIOMETRIC_LAST_USED_KEY);
    return lastUsed ? new Date(lastUsed) : null;
  } catch {
    return null;
  }
}

/**
 * Retorna o nome do tipo de biometria em português
 */
export function getBiometricTypeName(type: 'face' | 'fingerprint' | 'none'): string {
  switch (type) {
    case 'face':
      return 'Face ID';
    case 'fingerprint':
      return 'Touch ID';
    default:
      return 'Biometria';
  }
}
