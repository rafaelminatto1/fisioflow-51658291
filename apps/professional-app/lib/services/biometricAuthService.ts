import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { auditLogger } from './auditLogger';
import { fetchApi } from '@/lib/api';

const BIOMETRIC_KEY = 'fisioflow_biometric_enabled';
const PIN_KEY = 'fisioflow_fallback_pin';
const DEVICE_ID_KEY = 'fisioflow_device_id';

export interface BiometricConfig {
  isEnabled: boolean;
  type: LocalAuthentication.AuthenticationType[];
  hasFallbackPin: boolean;
}

class BiometricAuthService {
  private static instance: BiometricAuthService;
  
  private constructor() {}

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Check if device supports biometrics
   */
  async checkHardwareSupport(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  /**
   * Get current biometric configuration
   */
  async getConfig(userId: string): Promise<BiometricConfig> {
    try {
      const isEnabled = await SecureStore.getItemAsync(`${BIOMETRIC_KEY}_${userId}`) === 'true';
      const hasPin = !!(await SecureStore.getItemAsync(`${PIN_KEY}_${userId}`));
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      return {
        isEnabled,
        type: types,
        hasFallbackPin: hasPin
      };
    } catch (error) {
      console.error('Error getting biometric config:', error);
      return {
        isEnabled: false,
        type: [],
        hasFallbackPin: false
      };
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometrics(userId: string, pin?: string): Promise<boolean> {
    try {
      const isSupported = await this.checkHardwareSupport();
      if (!isSupported) {
        throw new Error('Biometrics not supported or not configured on device');
      }

      // Authenticate to verify user
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua identidade para habilitar a biometria',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: true,
      });

      if (!result.success) {
        return false;
      }

      // Save to secure store
      await SecureStore.setItemAsync(`${BIOMETRIC_KEY}_${userId}`, 'true');
      if (pin) {
        await SecureStore.setItemAsync(`${PIN_KEY}_${userId}`, pin);
      }

      // Generate device ID for trusted devices
      let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15);
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      }

      // Save to API
      await fetchApi('/api/settings/security', {
          method: 'POST',
          data: {
            userId,
            device: {
              id: deviceId,
              platform: Platform.OS,
              addedAt: new Date().toISOString()
            },
            biometricsEnabled: true
          }
      }).catch(err => console.log('Failed to save biometric settings to server', err));

      // Audit log
      await auditLogger.logEvent({
        userId,
        action: 'update',
        resourceType: 'biometrics',
        details: { action: 'enabled' }
      });

      return true;
    } catch (error) {
      console.error('Error enabling biometrics:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometrics(userId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`${BIOMETRIC_KEY}_${userId}`);
      await SecureStore.deleteItemAsync(`${PIN_KEY}_${userId}`);

      const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

      // Remove from API
      if (deviceId) {
          await fetchApi(`/api/settings/security/device/${deviceId}`, {
              method: 'DELETE',
              data: { userId }
          }).catch(err => console.log('Failed to remove biometric device from server', err));
      }

      // Audit log
      await auditLogger.logEvent({
        userId,
        action: 'update',
        resourceType: 'biometrics',
        details: { action: 'disabled' }
      });
    } catch (error) {
      console.error('Error disabling biometrics:', error);
      throw error;
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(userId: string, reason: string = 'Confirmar acesso'): Promise<boolean> {
    try {
      const isEnabled = await SecureStore.getItemAsync(`${BIOMETRIC_KEY}_${userId}`) === 'true';
      if (!isEnabled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Usar PIN',
        fallbackLabel: 'Usar PIN',
      });

      if (result.success) {
        // Log access if reason implies PHI
        if (reason.toLowerCase().includes('prontuário') || reason.toLowerCase().includes('paciente')) {
           // We might need to pass resourceId to logPHIAccess appropriately
        }
      }

      return result.success;
    } catch (error) {
      console.error('Error authenticating:', error);
      return false;
    }
  }

  /**
   * Verify fallback PIN
   */
  async verifyPin(userId: string, pin: string): Promise<boolean> {
    try {
      const savedPin = await SecureStore.getItemAsync(`${PIN_KEY}_${userId}`);
      return savedPin === pin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }
}

export const biometricAuthService = BiometricAuthService.getInstance();
