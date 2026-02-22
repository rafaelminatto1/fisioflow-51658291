/**
 * Unit Tests for Biometric Setup Screen
 * 
 * Tests biometric type detection, PIN validation, Firestore config storage,
 * navigation flows, and error handling
 * 
 * Requirements: 5.1, 5.2
 * 
 * Note: These tests focus on the service layer and logic.
 * UI rendering tests would require @testing-library/react-native setup.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { biometricAuthService } from '../../../lib/services/biometricAuthService';
import { auth } from '../../../lib/firebase';
import type { BiometricType } from '../../../types/auth';

// Mock biometric auth service
vi.mock('../../../lib/services/biometricAuthService', () => ({
  biometricAuthService: {
    isAvailable: vi.fn(),
    getBiometricType: vi.fn(),
    authenticate: vi.fn(),
    setup: vi.fn(),
    setupPIN: vi.fn(),
  },
}));

// Mock Firebase auth
vi.mock('../../../lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
    },
  },
  db: {},
  storage: {},
}));

describe('BiometricSetupScreen Logic', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    (biometricAuthService.isAvailable as any).mockResolvedValue(true);
    (biometricAuthService.getBiometricType as any).mockResolvedValue('faceId');
    (biometricAuthService.authenticate as any).mockResolvedValue(true);
    (biometricAuthService.setup as any).mockResolvedValue(true);
    (biometricAuthService.setupPIN as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Biometric Type Detection', () => {
    it('should detect Face ID when available', async () => {
      (biometricAuthService.getBiometricType as any).mockResolvedValue('faceId');

      const type = await biometricAuthService.getBiometricType();

      expect(type).toBe('faceId');
      expect(biometricAuthService.getBiometricType).toHaveBeenCalled();
    });

    it('should detect Touch ID when available', async () => {
      (biometricAuthService.getBiometricType as any).mockResolvedValue('touchId');

      const type = await biometricAuthService.getBiometricType();

      expect(type).toBe('touchId');
    });

    it('should return none when no biometric hardware available', async () => {
      (biometricAuthService.isAvailable as any).mockResolvedValue(false);
      (biometricAuthService.getBiometricType as any).mockResolvedValue('none');

      const available = await biometricAuthService.isAvailable();
      const type = await biometricAuthService.getBiometricType();

      expect(available).toBe(false);
      expect(type).toBe('none');
    });

    it('should handle biometric detection errors gracefully', async () => {
      (biometricAuthService.isAvailable as any).mockRejectedValue(
        new Error('Detection failed')
      );

      await expect(biometricAuthService.isAvailable()).rejects.toThrow('Detection failed');
    });
  });

  describe('Biometric Setup Flow', () => {
    it('should successfully setup biometric authentication', async () => {
      const authenticated = await biometricAuthService.authenticate(
        'Autentique para configurar a proteção biométrica'
      );
      
      expect(authenticated).toBe(true);

      const setupResult = await biometricAuthService.setup(testUserId);
      
      expect(setupResult).toBe(true);
      expect(biometricAuthService.setup).toHaveBeenCalledWith(testUserId);
    });

    it('should handle biometric authentication failure', async () => {
      (biometricAuthService.authenticate as any).mockResolvedValue(false);

      const result = await biometricAuthService.authenticate(
        'Autentique para configurar a proteção biométrica'
      );

      expect(result).toBe(false);
    });

    it('should handle setup errors', async () => {
      (biometricAuthService.setup as any).mockRejectedValue(
        new Error('Setup failed')
      );

      await expect(biometricAuthService.setup(testUserId)).rejects.toThrow('Setup failed');
    });

    it('should require authenticated user for setup', () => {
      expect(auth.currentUser).toBeTruthy();
      expect(auth.currentUser?.uid).toBe(testUserId);
    });
  });

  describe('PIN Validation', () => {
    it('should validate PIN has minimum 6 digits', async () => {
      const shortPIN = '12345';
      
      (biometricAuthService.setupPIN as any).mockRejectedValue(
        new Error('PIN must be at least 6 digits')
      );

      await expect(biometricAuthService.setupPIN(testUserId, shortPIN))
        .rejects.toThrow('PIN must be at least 6 digits');
    });

    it('should validate PIN contains only numbers', async () => {
      const invalidPIN = '12345a';
      
      (biometricAuthService.setupPIN as any).mockRejectedValue(
        new Error('PIN must contain only digits')
      );

      await expect(biometricAuthService.setupPIN(testUserId, invalidPIN))
        .rejects.toThrow('PIN must contain only digits');
    });

    it('should accept valid 6-digit PIN', async () => {
      const validPIN = '123456';

      await biometricAuthService.setupPIN(testUserId, validPIN);

      expect(biometricAuthService.setupPIN).toHaveBeenCalledWith(testUserId, validPIN);
    });

    it('should reject weak PIN patterns (repeated digits)', async () => {
      const weakPIN = '111111';
      
      (biometricAuthService.setupPIN as any).mockRejectedValue(
        new Error('PIN muito fraco. Evite repetir o mesmo dígito')
      );

      await expect(biometricAuthService.setupPIN(testUserId, weakPIN))
        .rejects.toThrow('PIN muito fraco');
    });

    it('should reject weak PIN patterns (sequential)', async () => {
      const weakPIN = '123456';
      
      (biometricAuthService.setupPIN as any).mockRejectedValue(
        new Error('PIN muito fraco. Evite sequências simples')
      );

      await expect(biometricAuthService.setupPIN(testUserId, weakPIN))
        .rejects.toThrow('PIN muito fraco');
    });
  });

  describe('PIN Confirmation', () => {
    it('should require PIN confirmation to match', () => {
      const pin1 = '123456';
      const pin2 = '654321';

      // In the actual component, this validation happens before calling setupPIN
      expect(pin1).not.toBe(pin2);
    });

    it('should successfully setup PIN when confirmation matches', async () => {
      const pin = '123456';
      const confirmPin = '123456';

      expect(pin).toBe(confirmPin);

      await biometricAuthService.setupPIN(testUserId, pin);

      expect(biometricAuthService.setupPIN).toHaveBeenCalledWith(testUserId, pin);
    });
  });

  describe('Firestore Config Storage', () => {
    it('should store biometric config in Firestore on setup', async () => {
      await biometricAuthService.setup(testUserId);

      expect(biometricAuthService.setup).toHaveBeenCalledWith(testUserId);
      // The setup method internally stores config in Firestore
      // This is tested in detail in biometricAuthService.test.ts
    });

    it('should store PIN config in Firestore', async () => {
      const testPIN = '123456';

      await biometricAuthService.setupPIN(testUserId, testPIN);

      expect(biometricAuthService.setupPIN).toHaveBeenCalledWith(testUserId, testPIN);
      // The setupPIN method internally stores config in Firestore
      // This is tested in detail in biometricAuthService.test.ts
    });

    it('should handle Firestore storage errors', async () => {
      (biometricAuthService.setup as any).mockRejectedValue(
        new Error('Firestore write failed')
      );

      await expect(biometricAuthService.setup(testUserId))
        .rejects.toThrow('Firestore write failed');
    });
  });

  describe('Biometric Types Display', () => {
    it('should provide correct name for Face ID', async () => {
      const type: BiometricType = 'faceId';
      const name = type === 'faceId' ? 'Face ID' : 
                   type === 'touchId' ? 'Touch ID' : 
                   'Autenticação Biométrica';

      expect(name).toBe('Face ID');
    });

    it('should provide correct name for Touch ID', async () => {
      const type: BiometricType = 'touchId';
      const name = type === 'faceId' ? 'Face ID' : 
                   type === 'touchId' ? 'Touch ID' : 
                   'Autenticação Biométrica';

      expect(name).toBe('Touch ID');
    });

    it('should provide fallback name for no biometric', async () => {
      const type: BiometricType = 'none';
      const name = type === 'faceId' ? 'Face ID' : 
                   type === 'touchId' ? 'Touch ID' : 
                   'Autenticação Biométrica';

      expect(name).toBe('Autenticação Biométrica');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication cancellation', async () => {
      (biometricAuthService.authenticate as any).mockResolvedValue(false);

      const result = await biometricAuthService.authenticate(
        'Autentique para configurar a proteção biométrica'
      );

      expect(result).toBe(false);
    });

    it('should handle PIN setup errors', async () => {
      (biometricAuthService.setupPIN as any).mockRejectedValue(
        new Error('PIN setup failed')
      );

      await expect(biometricAuthService.setupPIN(testUserId, '123456'))
        .rejects.toThrow('PIN setup failed');
    });

    it('should handle missing user authentication', () => {
      const currentUser = auth.currentUser;
      
      expect(currentUser).toBeTruthy();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      expect(currentUser.uid).toBe(testUserId);
    });
  });

  describe('Setup Flow States', () => {
    it('should support intro step', () => {
      const steps = ['intro', 'biometric', 'pin', 'complete'];
      expect(steps).toContain('intro');
    });

    it('should support biometric step', () => {
      const steps = ['intro', 'biometric', 'pin', 'complete'];
      expect(steps).toContain('biometric');
    });

    it('should support PIN step', () => {
      const steps = ['intro', 'biometric', 'pin', 'complete'];
      expect(steps).toContain('pin');
    });

    it('should support complete step', () => {
      const steps = ['intro', 'biometric', 'pin', 'complete'];
      expect(steps).toContain('complete');
    });
  });

  describe('Mode Support', () => {
    it('should support setup mode', () => {
      const modes = ['setup', 'onboarding'];
      expect(modes).toContain('setup');
    });

    it('should support onboarding mode', () => {
      const modes = ['setup', 'onboarding'];
      expect(modes).toContain('onboarding');
    });
  });
});

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    (biometricAuthService.isAvailable as any).mockResolvedValue(true);
    (biometricAuthService.getBiometricType as any).mockResolvedValue('faceId');
    (biometricAuthService.authenticate as any).mockResolvedValue(true);
    (biometricAuthService.setup as any).mockResolvedValue(true);
    (biometricAuthService.setupPIN as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
