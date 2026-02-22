/**
 * Unit Tests for Biometric Authentication Service
 * 
 * Tests biometric hardware detection, authentication flow, PIN fallback,
 * account lockout, and biometric data clearing
 * Requirements: 5.1, 5.2, 5.7
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BiometricAuthService } from '../../lib/services/biometricAuthService';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Mock expo-local-authentication
vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  supportedAuthenticationTypesAsync: vi.fn(),
  authenticateAsync: vi.fn(),
  AuthenticationType: {
    FACIAL_RECOGNITION: 1,
    FINGERPRINT: 2,
  },
}));

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

// Mock expo-crypto
vi.mock('expo-crypto', () => ({
  digestStringAsync: vi.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

// Mock firebase config
vi.mock('../../lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
}));

describe('BiometricAuthService', () => {
  let biometricAuthService: BiometricAuthService;
  const testUserId = 'test-user-123';
  const testPIN = '123456';

  beforeEach(() => {
    biometricAuthService = BiometricAuthService.getInstance();
    vi.clearAllMocks();

    // Setup default mocks
    (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as any).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as any).mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
      success: true,
    });
    (SecureStore.setItemAsync as any).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as any).mockResolvedValue(null);
    (SecureStore.deleteItemAsync as any).mockResolvedValue(undefined);
    (Crypto.digestStringAsync as any).mockResolvedValue('mock-hash-' + Math.random());
    (doc as any).mockReturnValue({ id: testUserId });
    (getDoc as any).mockResolvedValue({
      exists: () => false,
      data: () => null,
    });
    (setDoc as any).mockResolvedValue(undefined);
    (updateDoc as any).mockResolvedValue(undefined);
    (deleteDoc as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when hardware is available and enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as any).mockResolvedValue(true);

      const available = await biometricAuthService.isAvailable();

      expect(available).toBe(true);
      expect(LocalAuthentication.hasHardwareAsync).toHaveBeenCalled();
      expect(LocalAuthentication.isEnrolledAsync).toHaveBeenCalled();
    });

    it('should return false when hardware is not available', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(false);

      const available = await biometricAuthService.isAvailable();

      expect(available).toBe(false);
    });

    it('should return false when biometric is not enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as any).mockResolvedValue(false);

      const available = await biometricAuthService.isAvailable();

      expect(available).toBe(false);
    });

    it('should return false on error', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockRejectedValue(
        new Error('Hardware check failed')
      );

      const available = await biometricAuthService.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('getBiometricType', () => {
    it('should return "faceId" for Face ID', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as any).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const type = await biometricAuthService.getBiometricType();

      expect(type).toBe('faceId');
    });

    it('should return "touchId" for Touch ID', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as any).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const type = await biometricAuthService.getBiometricType();

      expect(type).toBe('touchId');
    });

    it('should return "none" when no hardware available', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(false);

      const type = await biometricAuthService.getBiometricType();

      expect(type).toBe('none');
    });

    it('should return "none" when no supported types', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as any).mockResolvedValue([]);

      const type = await biometricAuthService.getBiometricType();

      expect(type).toBe('none');
    });

    it('should return "none" on error', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockRejectedValue(
        new Error('Type check failed')
      );

      const type = await biometricAuthService.getBiometricType();

      expect(type).toBe('none');
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully with default reason', async () => {
      (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
        success: true,
      });

      const result = await biometricAuthService.authenticate();

      expect(result).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Autentique para acessar dados de saúde',
        fallbackLabel: 'Usar PIN',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
    });

    it('should authenticate successfully with custom reason', async () => {
      const customReason = 'Autentique para visualizar paciente';
      (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
        success: true,
      });

      const result = await biometricAuthService.authenticate(customReason);

      expect(result).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: customReason,
        })
      );
    });

    it('should return false when authentication fails', async () => {
      (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const result = await biometricAuthService.authenticate();

      expect(result).toBe(false);
    });

    it('should return false when biometric is not available', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(false);

      const result = await biometricAuthService.authenticate();

      expect(result).toBe(false);
    });

    it('should return false on authentication error', async () => {
      (LocalAuthentication.authenticateAsync as any).mockRejectedValue(
        new Error('Authentication error')
      );

      const result = await biometricAuthService.authenticate();

      expect(result).toBe(false);
    });
  });

  describe('setup', () => {
    it('should setup biometric authentication successfully', async () => {
      const result = await biometricAuthService.setup(testUserId);

      expect(result).toBe(true);
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: testUserId,
          enabled: true,
          type: 'faceId',
          fallbackEnabled: true,
          requireOnLaunch: true,
          requireAfterBackground: true,
          backgroundTimeout: 300,
          failedAttempts: 0,
        })
      );
    });

    it('should throw error when biometric is not available', async () => {
      (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(false);

      await expect(biometricAuthService.setup(testUserId)).rejects.toThrow(
        'Biometric authentication not available on this device'
      );
    });

    it('should store correct biometric type', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as any).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      await biometricAuthService.setup(testUserId);

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'touchId',
        })
      );
    });

    it('should throw error if Firestore write fails', async () => {
      (setDoc as any).mockRejectedValue(new Error('Firestore write failed'));

      await expect(biometricAuthService.setup(testUserId)).rejects.toThrow(
        'Firestore write failed'
      );
    });
  });

  describe('disable', () => {
    it('should disable biometric authentication', async () => {
      await biometricAuthService.disable(testUserId);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          enabled: false,
        })
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        expect.stringContaining(testUserId)
      );
    });

    it('should throw error if Firestore update fails', async () => {
      (updateDoc as any).mockRejectedValue(new Error('Firestore update failed'));

      await expect(biometricAuthService.disable(testUserId)).rejects.toThrow(
        'Firestore update failed'
      );
    });
  });

  describe('setupPIN', () => {
    it('should setup PIN successfully', async () => {
      const mockHash = 'mock-pin-hash-123456';
      (Crypto.digestStringAsync as any).mockResolvedValue(mockHash);
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: testUserId, enabled: true }),
      });

      await biometricAuthService.setupPIN(testUserId, testPIN);

      expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        testPIN
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining(testUserId),
        mockHash,
        expect.objectContaining({
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fallbackEnabled: true,
          pinHash: mockHash.substring(0, 16),
        })
      );
    });

    it('should throw error if PIN is too short', async () => {
      await expect(biometricAuthService.setupPIN(testUserId, '12345')).rejects.toThrow(
        'PIN must be at least 6 digits'
      );
    });

    it('should throw error if PIN contains non-digits', async () => {
      await expect(biometricAuthService.setupPIN(testUserId, '12345a')).rejects.toThrow(
        'PIN must contain only digits'
      );
    });

    it('should throw error if hashing fails', async () => {
      (Crypto.digestStringAsync as any).mockRejectedValue(new Error('Hashing failed'));

      await expect(biometricAuthService.setupPIN(testUserId, testPIN)).rejects.toThrow(
        'Hashing failed'
      );
    });

    it('should throw error if SecureStore write fails', async () => {
      (SecureStore.setItemAsync as any).mockRejectedValue(
        new Error('SecureStore write failed')
      );

      await expect(biometricAuthService.setupPIN(testUserId, testPIN)).rejects.toThrow(
        'SecureStore write failed'
      );
    });
  });

  describe('verifyPIN', () => {
    const mockHash = 'mock-pin-hash-123456';

    beforeEach(() => {
      (Crypto.digestStringAsync as any).mockResolvedValue(mockHash);
      (SecureStore.getItemAsync as any).mockResolvedValue(mockHash);
    });

    it('should verify correct PIN successfully', async () => {
      const result = await biometricAuthService.verifyPIN(testUserId, testPIN);

      expect(result).toBe(true);
      expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        testPIN
      );
    });

    it('should return false for incorrect PIN', async () => {
      (Crypto.digestStringAsync as any).mockResolvedValue('different-hash');

      const result = await biometricAuthService.verifyPIN(testUserId, '654321');

      expect(result).toBe(false);
    });

    it('should return false when no PIN is stored', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue(null);

      const result = await biometricAuthService.verifyPIN(testUserId, testPIN);

      expect(result).toBe(false);
    });

    it('should track failed attempt on incorrect PIN', async () => {
      (Crypto.digestStringAsync as any).mockResolvedValue('different-hash');

      await biometricAuthService.verifyPIN(testUserId, '654321');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        '1'
      );
    });

    it('should reset failed attempts on successful verification', async () => {
      await biometricAuthService.verifyPIN(testUserId, testPIN);

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('failed')
      );
    });

    it('should throw error when account is locked', async () => {
      // Mock locked account
      const lockoutTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      (SecureStore.getItemAsync as any).mockImplementation((key: string) => {
        if (key.includes('lockout')) {
          return Promise.resolve(lockoutTime.toISOString());
        }
        return Promise.resolve(mockHash);
      });

      await expect(biometricAuthService.verifyPIN(testUserId, testPIN)).rejects.toThrow(
        'Account is locked'
      );
    });
  });

  describe('handleFailedAttempt', () => {
    it('should increment failed attempts counter', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue('2');

      await biometricAuthService.handleFailedAttempt(testUserId);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        '3'
      );
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          failedAttempts: 3,
        })
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue('4');

      await biometricAuthService.handleFailedAttempt(testUserId);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        '5'
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('lockout'),
        expect.any(String)
      );
    });

    it('should start from 0 if no previous attempts', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue(null);

      await biometricAuthService.handleFailedAttempt(testUserId);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        '1'
      );
    });
  });

  describe('isLocked', () => {
    it('should return false when no lockout is set', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue(null);

      const locked = await biometricAuthService.isLocked(testUserId);

      expect(locked).toBe(false);
    });

    it('should return true when lockout is active', async () => {
      const lockoutTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      (SecureStore.getItemAsync as any).mockResolvedValue(lockoutTime.toISOString());

      const locked = await biometricAuthService.isLocked(testUserId);

      expect(locked).toBe(true);
    });

    it('should return false and unlock when lockout has expired', async () => {
      const lockoutTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      (SecureStore.getItemAsync as any).mockResolvedValue(lockoutTime.toISOString());

      const locked = await biometricAuthService.isLocked(testUserId);

      expect(locked).toBe(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('lockout')
      );
    });

    it('should return false on error', async () => {
      (SecureStore.getItemAsync as any).mockRejectedValue(new Error('Read failed'));

      const locked = await biometricAuthService.isLocked(testUserId);

      expect(locked).toBe(false);
    });
  });

  describe('lockout timeout', () => {
    it('should lock account for 15 minutes', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue('4');

      await biometricAuthService.handleFailedAttempt(testUserId);

      // Check that lockout time is approximately 15 minutes from now
      const lockoutCall = (SecureStore.setItemAsync as any).mock.calls.find((call: any) =>
        call[0].includes('lockout')
      );
      expect(lockoutCall).toBeDefined();

      const lockoutTime = new Date(lockoutCall[1]);
      const expectedTime = new Date(Date.now() + 15 * 60 * 1000);
      const timeDiff = Math.abs(lockoutTime.getTime() - expectedTime.getTime());

      // Allow 1 second tolerance
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should update Firestore with lockout time', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue('4');

      await biometricAuthService.handleFailedAttempt(testUserId);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lockedUntil: expect.any(Date),
        })
      );
    });
  });

  describe('clearBiometricData', () => {
    it('should clear all biometric data', async () => {
      await biometricAuthService.clearBiometricData(testUserId);

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('pin')
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('failed')
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('lockout')
      );
    });

    it('should throw error if clearing fails', async () => {
      (SecureStore.deleteItemAsync as any).mockRejectedValue(
        new Error('Delete failed')
      );

      await expect(biometricAuthService.clearBiometricData(testUserId)).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  describe('getConfig', () => {
    it('should return config from Firestore', async () => {
      const mockConfig = {
        userId: testUserId,
        enabled: true,
        type: 'faceId',
        fallbackEnabled: true,
        requireOnLaunch: true,
        requireAfterBackground: true,
        backgroundTimeout: 300,
        failedAttempts: 0,
      };

      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => mockConfig,
      });

      const config = await biometricAuthService.getConfig(testUserId);

      expect(config).toMatchObject(mockConfig);
    });

    it('should return null when config does not exist', async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => false,
      });

      const config = await biometricAuthService.getConfig(testUserId);

      expect(config).toBeNull();
    });

    it('should return null on error', async () => {
      (getDoc as any).mockRejectedValue(new Error('Firestore read failed'));

      const config = await biometricAuthService.getConfig(testUserId);

      expect(config).toBeNull();
    });
  });

  describe('isEnabled', () => {
    it('should return true when biometric is enabled', async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({ enabled: true }),
      });

      const enabled = await biometricAuthService.isEnabled(testUserId);

      expect(enabled).toBe(true);
    });

    it('should return false when biometric is disabled', async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({ enabled: false }),
      });

      const enabled = await biometricAuthService.isEnabled(testUserId);

      expect(enabled).toBe(false);
    });

    it('should return false when config does not exist', async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => false,
      });

      const enabled = await biometricAuthService.isEnabled(testUserId);

      expect(enabled).toBe(false);
    });

    it('should return false on error', async () => {
      (getDoc as any).mockRejectedValue(new Error('Firestore read failed'));

      const enabled = await biometricAuthService.isEnabled(testUserId);

      expect(enabled).toBe(false);
    });
  });
});
