/**
 * Biometric Authentication Service for FisioFlow Professional App
 * Implements Face ID/Touch ID authentication with PIN fallback
 * 
 * Features:
 * - Hardware detection for Face ID/Touch ID
 * - Biometric authentication with customizable prompts
 * - PIN fallback (6 digits minimum)
 * - Account lockout after 5 failed attempts (15 minute timeout)
 * - Secure storage of biometric config in Firestore
 * - Integration with expo-local-authentication
 * 
 * Requirements: 5.1, 5.2, 5.7, 5.9
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BiometricConfig, BiometricType, AUTH_CONSTANTS } from '../../types/auth';

/**
 * Biometric Authentication Service
 * Provides Face ID/Touch ID authentication with PIN fallback
 */
export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private readonly COLLECTION_NAME = 'biometric_configs';
  private readonly PIN_KEY_PREFIX = 'biometric_pin_';
  private readonly FAILED_ATTEMPTS_KEY_PREFIX = 'biometric_failed_';
  private readonly LOCKOUT_KEY_PREFIX = 'biometric_lockout_';

  /**
   * Get singleton instance
   */
  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Check if biometric authentication is available on device
   * 
   * @returns True if hardware is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('[BiometricAuthService] Failed to check availability:', error);
      return false;
    }
  }

  /**
   * Get the type of biometric authentication available
   * 
   * @returns 'faceId', 'touchId', or 'none'
   */
  async getBiometricType(): Promise<BiometricType> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return 'none';
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      // Check for Face ID (iOS) or Face Recognition (Android)
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'faceId';
      }
      
      // Check for Touch ID (iOS) or Fingerprint (Android)
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'touchId';
      }

      return 'none';
    } catch (error) {
      console.error('[BiometricAuthService] Failed to get biometric type:', error);
      return 'none';
    }
  }

  /**
   * Authenticate user with Face ID/Touch ID
   * 
   * @param reason - Message to display to user
   * @returns True if authentication successful
   */
  async authenticate(reason: string = 'Autentique para acessar dados de saúde'): Promise<boolean> {
    try {
      // Check if available
      const available = await this.isAvailable();
      if (!available) {
        console.warn('[BiometricAuthService] Biometric authentication not available');
        return false;
      }

      // Perform authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Usar PIN',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log('[BiometricAuthService] Authentication successful');
        return true;
      }

      console.log('[BiometricAuthService] Authentication failed:', result.error);
      return false;
    } catch (error) {
      console.error('[BiometricAuthService] Authentication error:', error);
      return false;
    }
  }

  /**
   * Setup biometric authentication for user
   * Enables biometric auth and stores config in Firestore
   * 
   * @param userId - User ID
   * @returns True if setup successful
   */
  async setup(userId: string): Promise<boolean> {
    try {
      // Check if biometric is available
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('Biometric authentication not available on this device');
      }

      // Get biometric type
      const type = await this.getBiometricType();

      // Create biometric config
      const config: BiometricConfig = {
        userId,
        enabled: true,
        type,
        fallbackEnabled: true,
        requireOnLaunch: true,
        requireAfterBackground: true,
        backgroundTimeout: AUTH_CONSTANTS.BACKGROUND_TIMEOUT_SECONDS,
        failedAttempts: 0,
      };

      // Store config in Firestore
      const configRef = doc(db, this.COLLECTION_NAME, userId);
      await setDoc(configRef, {
        ...config,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('[BiometricAuthService] Biometric authentication setup successful');
      return true;
    } catch (error) {
      console.error('[BiometricAuthService] Setup failed:', error);
      throw error;
    }
  }

  /**
   * Disable biometric authentication for user
   * 
   * @param userId - User ID
   */
  async disable(userId: string): Promise<void> {
    try {
      // Update config in Firestore
      const configRef = doc(db, this.COLLECTION_NAME, userId);
      await updateDoc(configRef, {
        enabled: false,
        updatedAt: new Date(),
      });

      // Clear PIN from SecureStore
      await this.clearPIN(userId);

      console.log('[BiometricAuthService] Biometric authentication disabled');
    } catch (error) {
      console.error('[BiometricAuthService] Failed to disable:', error);
      throw error;
    }
  }

  /**
   * Setup PIN as fallback authentication
   * Stores hashed PIN in SecureStore
   * 
   * @param userId - User ID
   * @param pin - PIN (minimum 6 digits)
   */
  async setupPIN(userId: string, pin: string): Promise<void> {
    try {
      // Validate PIN
      if (pin.length < AUTH_CONSTANTS.MIN_PIN_LENGTH) {
        throw new Error(`PIN must be at least ${AUTH_CONSTANTS.MIN_PIN_LENGTH} digits`);
      }

      if (!/^\d+$/.test(pin)) {
        throw new Error('PIN must contain only digits');
      }

      // Hash PIN using SHA-256
      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin
      );

      // Store hashed PIN in SecureStore
      const pinKey = `${this.PIN_KEY_PREFIX}${userId}`;
      await SecureStore.setItemAsync(pinKey, pinHash, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      // Update config in Firestore
      const configRef = doc(db, this.COLLECTION_NAME, userId);
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        await updateDoc(configRef, {
          fallbackEnabled: true,
          pinHash: pinHash.substring(0, 16), // Store first 16 chars for verification
          updatedAt: new Date(),
        });
      }

      console.log('[BiometricAuthService] PIN setup successful');
    } catch (error) {
      console.error('[BiometricAuthService] PIN setup failed:', error);
      throw error;
    }
  }

  /**
   * Verify PIN for fallback authentication
   * 
   * @param userId - User ID
   * @param pin - PIN to verify
   * @returns True if PIN is correct
   */
  async verifyPIN(userId: string, pin: string): Promise<boolean> {
    try {
      // Check if account is locked
      const locked = await this.isLocked(userId);
      if (locked) {
        throw new Error('Account is locked due to too many failed attempts. Please try again later.');
      }

      // Retrieve stored PIN hash
      const pinKey = `${this.PIN_KEY_PREFIX}${userId}`;
      const storedHash = await SecureStore.getItemAsync(pinKey);

      if (!storedHash) {
        console.warn('[BiometricAuthService] No PIN found for user');
        return false;
      }

      // Hash provided PIN
      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin
      );

      // Compare hashes
      const isValid = pinHash === storedHash;

      if (isValid) {
        // Reset failed attempts on successful verification
        await this.resetFailedAttempts(userId);
        console.log('[BiometricAuthService] PIN verification successful');
      } else {
        // Track failed attempt
        await this.handleFailedAttempt(userId);
        console.log('[BiometricAuthService] PIN verification failed');
      }

      return isValid;
    } catch (error) {
      console.error('[BiometricAuthService] PIN verification error:', error);
      throw error;
    }
  }

  /**
   * Handle failed authentication attempt
   * Tracks failures and locks account after 5 attempts
   * 
   * @param userId - User ID
   */
  async handleFailedAttempt(userId: string): Promise<void> {
    try {
      // Get current failed attempts count
      const attemptsKey = `${this.FAILED_ATTEMPTS_KEY_PREFIX}${userId}`;
      const attemptsStr = await SecureStore.getItemAsync(attemptsKey);
      const currentAttempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

      // Increment failed attempts
      const newAttempts = currentAttempts + 1;
      await SecureStore.setItemAsync(attemptsKey, newAttempts.toString());

      // Update Firestore config
      const configRef = doc(db, this.COLLECTION_NAME, userId);
      await updateDoc(configRef, {
        failedAttempts: newAttempts,
        updatedAt: new Date(),
      });

      // Check if should lock account
      if (newAttempts >= AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS) {
        await this.lockAccount(userId);
        console.warn('[BiometricAuthService] Account locked due to too many failed attempts');
      }

      console.log(`[BiometricAuthService] Failed attempt recorded: ${newAttempts}/${AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS}`);
    } catch (error) {
      console.error('[BiometricAuthService] Failed to handle failed attempt:', error);
    }
  }

  /**
   * Check if account is locked due to failed attempts
   * 
   * @param userId - User ID
   * @returns True if account is locked
   */
  async isLocked(userId: string): Promise<boolean> {
    try {
      // Get lockout timestamp
      const lockoutKey = `${this.LOCKOUT_KEY_PREFIX}${userId}`;
      const lockoutStr = await SecureStore.getItemAsync(lockoutKey);

      if (!lockoutStr) {
        return false;
      }

      const lockoutUntil = new Date(lockoutStr);
      const now = new Date();

      // Check if lockout period has expired
      if (now >= lockoutUntil) {
        // Lockout expired, clear it
        await this.unlockAccount(userId);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[BiometricAuthService] Failed to check lock status:', error);
      return false;
    }
  }

  /**
   * Lock account for 15 minutes after failed attempts
   * 
   * @param userId - User ID
   */
  private async lockAccount(userId: string): Promise<void> {
    try {
      // Calculate lockout time (15 minutes from now)
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES);

      // Store lockout timestamp
      const lockoutKey = `${this.LOCKOUT_KEY_PREFIX}${userId}`;
      await SecureStore.setItemAsync(lockoutKey, lockoutUntil.toISOString());

      // Update Firestore config
      const configRef = doc(db, this.COLLECTION_NAME, userId);
      await updateDoc(configRef, {
        lockedUntil: lockoutUntil,
        updatedAt: new Date(),
      });

      console.log('[BiometricAuthService] Account locked until:', lockoutUntil);
    } catch (error) {
      console.error('[BiometricAuthService] Failed to lock account:', error);
    }
  }

  /**
   * Unlock account after lockout period expires
   * 
   * @param userId - User ID
   */
  private async unlockAccount(userId: string): Promise<void> {
    try {
      // Clear lockout timestamp
      const lockoutKey = `${this.LOCKOUT_KEY_PREFIX}${userId}`;
      await SecureStore.deleteItemAsync(lockoutKey);

      // Reset failed attempts
      await this.resetFailedAttempts(userId);

      // Update Firestore config
      const configRef = doc(db, this.COLLECTION_NAME, userId);
      await updateDoc(configRef, {
        lockedUntil: null,
        failedAttempts: 0,
        updatedAt: new Date(),
      });

      console.log('[BiometricAuthService] Account unlocked');
    } catch (error) {
      console.error('[BiometricAuthService] Failed to unlock account:', error);
    }
  }

  /**
   * Reset failed attempts counter
   * 
   * @param userId - User ID
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    try {
      const attemptsKey = `${this.FAILED_ATTEMPTS_KEY_PREFIX}${userId}`;
      await SecureStore.deleteItemAsync(attemptsKey);

      // Update Firestore config
      const configRef = doc(db, this.COLLECTION_NAME, userId);
      await updateDoc(configRef, {
        failedAttempts: 0,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('[BiometricAuthService] Failed to reset attempts:', error);
    }
  }

  /**
   * Clear PIN from SecureStore
   * 
   * @param userId - User ID
   */
  private async clearPIN(userId: string): Promise<void> {
    try {
      const pinKey = `${this.PIN_KEY_PREFIX}${userId}`;
      await SecureStore.deleteItemAsync(pinKey);
    } catch (error) {
      console.error('[BiometricAuthService] Failed to clear PIN:', error);
    }
  }

  /**
   * Clear all biometric data on logout
   * Removes PIN, failed attempts, and lockout data from SecureStore
   * 
   * @param userId - User ID
   */
  async clearBiometricData(userId: string): Promise<void> {
    try {
      // Clear PIN
      await this.clearPIN(userId);

      // Clear failed attempts
      const attemptsKey = `${this.FAILED_ATTEMPTS_KEY_PREFIX}${userId}`;
      await SecureStore.deleteItemAsync(attemptsKey);

      // Clear lockout
      const lockoutKey = `${this.LOCKOUT_KEY_PREFIX}${userId}`;
      await SecureStore.deleteItemAsync(lockoutKey);

      console.log('[BiometricAuthService] Biometric data cleared');
    } catch (error) {
      console.error('[BiometricAuthService] Failed to clear biometric data:', error);
      throw error;
    }
  }

  /**
   * Get biometric config from Firestore
   * 
   * @param userId - User ID
   * @returns Biometric config or null if not found
   */
  async getConfig(userId: string): Promise<BiometricConfig | null> {
    try {
      const configRef = doc(db, this.COLLECTION_NAME, userId);
      const configDoc = await getDoc(configRef);

      if (!configDoc.exists()) {
        return null;
      }

      const data = configDoc.data();
      return {
        userId: data.userId,
        enabled: data.enabled,
        type: data.type,
        fallbackEnabled: data.fallbackEnabled,
        pinHash: data.pinHash,
        requireOnLaunch: data.requireOnLaunch,
        requireAfterBackground: data.requireAfterBackground,
        backgroundTimeout: data.backgroundTimeout,
        failedAttempts: data.failedAttempts,
        lockedUntil: data.lockedUntil ? new Date(data.lockedUntil.seconds * 1000) : undefined,
      };
    } catch (error) {
      console.error('[BiometricAuthService] Failed to get config:', error);
      return null;
    }
  }

  /**
   * Check if biometric authentication is enabled for user
   * 
   * @param userId - User ID
   * @returns True if enabled
   */
  async isEnabled(userId: string): Promise<boolean> {
    try {
      const config = await this.getConfig(userId);
      return config?.enabled ?? false;
    } catch (error) {
      console.error('[BiometricAuthService] Failed to check if enabled:', error);
      return false;
    }
  }
}

// Export singleton instance
export const biometricAuthService = BiometricAuthService.getInstance();
