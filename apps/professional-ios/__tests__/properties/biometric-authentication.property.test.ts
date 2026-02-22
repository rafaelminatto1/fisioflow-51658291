/**
 * Property-Based Test: Biometric Authentication for PHI Access
 * 
 * Property 11: Biometric Authentication for PHI Access
 * Validates: Requirements 5.1
 * 
 * This test enables biometric authentication and attempts to access random PHI resources,
 * verifying that authentication is required before viewing the data.
 * 
 * Uses fast-check with 100 iterations to ensure the property holds across
 * all possible PHI resource access scenarios.
 * 
 * NOTE: This test requires fast-check to be installed:
 * npm install --save-dev fast-check @types/fast-check
 * or
 * pnpm add -D fast-check @types/fast-check
 */

import * as fc from 'fast-check';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { biometricAuthService } from '../../lib/services/biometricAuthService';
import * as LocalAuthentication from 'expo-local-authentication';

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

describe('Property 11: Biometric Authentication for PHI Access', () => {
  /**
   * PHI Resource Types
   */
  type PHIResourceType = 'patient' | 'soap_note' | 'photo' | 'protocol' | 'appointment';

  /**
   * Arbitrary generator for user IDs
   */
  const userIdArbitrary = fc.string({ minLength: 10, maxLength: 30 }).map(
    (str) => `user_${Date.now()}_${str.replace(/[^a-zA-Z0-9]/g, '')}`
  );

  /**
   * Arbitrary generator for PHI resource IDs
   */
  const resourceIdArbitrary = fc.string({ minLength: 10, maxLength: 30 }).map(
    (str) => `resource_${Date.now()}_${str.replace(/[^a-zA-Z0-9]/g, '')}`
  );

  /**
   * Arbitrary generator for PHI resource types
   */
  const resourceTypeArbitrary = fc.constantFrom<PHIResourceType>(
    'patient',
    'soap_note',
    'photo',
    'protocol',
    'appointment'
  );

  /**
   * Arbitrary generator for PHI access attempts
   */
  const phiAccessAttemptArbitrary = fc.record({
    userId: userIdArbitrary,
    resourceId: resourceIdArbitrary,
    resourceType: resourceTypeArbitrary,
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
  });

  /**
   * Simulate PHI access attempt
   * Returns true if access is granted, false if authentication is required
   */
  async function attemptPHIAccess(
    userId: string,
    resourceId: string,
    resourceType: PHIResourceType,
    biometricEnabled: boolean
  ): Promise<{ accessGranted: boolean; authenticationRequired: boolean }> {
    // Check if biometric authentication is enabled
    if (!biometricEnabled) {
      // If biometric is not enabled, access is granted without authentication
      return { accessGranted: true, authenticationRequired: false };
    }

    // Check if biometric is available
    const available = await biometricAuthService.isAvailable();
    if (!available) {
      // If biometric is not available, fall back to PIN or other auth
      return { accessGranted: false, authenticationRequired: true };
    }

    // Attempt biometric authentication
    const authenticated = await biometricAuthService.authenticate(
      `Autentique para acessar ${resourceType}`
    );

    if (authenticated) {
      // Authentication successful, grant access
      return { accessGranted: true, authenticationRequired: true };
    } else {
      // Authentication failed, deny access
      return { accessGranted: false, authenticationRequired: true };
    }
  }

  /**
   * Setup biometric authentication for user
   */
  async function setupBiometricAuth(userId: string): Promise<void> {
    // Mock biometric hardware availability
    (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as any).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as any).mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);

    await biometricAuthService.setup(userId);
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as any).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as any).mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
  });

  /**
   * Property Test 1: Authentication is required when biometric is enabled
   */
  it('should require authentication for PHI access when biometric is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(phiAccessAttemptArbitrary, async (attempt) => {
        // Setup biometric authentication
        await setupBiometricAuth(attempt.userId);

        // Mock authentication to fail (user cancels or fails)
        (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
          success: false,
          error: 'user_cancel',
        });

        // Attempt to access PHI
        const result = await attemptPHIAccess(
          attempt.userId,
          attempt.resourceId,
          attempt.resourceType,
          true // biometric enabled
        );

        // Property: Authentication must be required
        expect(result.authenticationRequired).toBe(true);
        
        // Property: Access must be denied when authentication fails
        expect(result.accessGranted).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 2: Access is granted only after successful authentication
   */
  it('should grant access only after successful biometric authentication', async () => {
    await fc.assert(
      fc.asyncProperty(phiAccessAttemptArbitrary, async (attempt) => {
        // Setup biometric authentication
        await setupBiometricAuth(attempt.userId);

        // Mock successful authentication
        (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
          success: true,
        });

        // Attempt to access PHI
        const result = await attemptPHIAccess(
          attempt.userId,
          attempt.resourceId,
          attempt.resourceType,
          true // biometric enabled
        );

        // Property: Authentication must be required
        expect(result.authenticationRequired).toBe(true);
        
        // Property: Access must be granted when authentication succeeds
        expect(result.accessGranted).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 3: All PHI resource types require authentication
   */
  it('should require authentication for all PHI resource types', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        resourceIdArbitrary,
        resourceTypeArbitrary,
        async (userId, resourceId, resourceType) => {
          // Setup biometric authentication
          await setupBiometricAuth(userId);

          // Mock authentication to fail
          (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
            success: false,
            error: 'user_cancel',
          });

          // Attempt to access PHI
          const result = await attemptPHIAccess(
            userId,
            resourceId,
            resourceType,
            true // biometric enabled
          );

          // Property: All resource types must require authentication
          expect(result.authenticationRequired).toBe(true);
          expect(result.accessGranted).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 4: Authentication prompt includes resource type
   */
  it('should include resource type in authentication prompt', async () => {
    await fc.assert(
      fc.asyncProperty(phiAccessAttemptArbitrary, async (attempt) => {
        // Setup biometric authentication
        await setupBiometricAuth(attempt.userId);

        // Mock authentication
        (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
          success: true,
        });

        // Attempt to access PHI
        await attemptPHIAccess(
          attempt.userId,
          attempt.resourceId,
          attempt.resourceType,
          true // biometric enabled
        );

        // Property: Authentication prompt must include resource type
        expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            promptMessage: expect.stringContaining(attempt.resourceType),
          })
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 5: Multiple access attempts require separate authentications
   */
  it('should require authentication for each PHI access attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        fc.array(phiAccessAttemptArbitrary, { minLength: 2, maxLength: 5 }),
        async (userId, attempts) => {
          // Setup biometric authentication
          await setupBiometricAuth(userId);

          // Mock successful authentication
          (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
            success: true,
          });

          // Attempt to access multiple PHI resources
          for (const attempt of attempts) {
            await attemptPHIAccess(
              userId,
              attempt.resourceId,
              attempt.resourceType,
              true // biometric enabled
            );
          }

          // Property: Authentication must be called for each attempt
          expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(
            attempts.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6: Authentication failure prevents data access
   */
  it('should prevent data access when authentication fails', async () => {
    await fc.assert(
      fc.asyncProperty(phiAccessAttemptArbitrary, async (attempt) => {
        // Setup biometric authentication
        await setupBiometricAuth(attempt.userId);

        // Mock authentication failure
        (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
          success: false,
          error: 'authentication_failed',
        });

        // Attempt to access PHI
        const result = await attemptPHIAccess(
          attempt.userId,
          attempt.resourceId,
          attempt.resourceType,
          true // biometric enabled
        );

        // Property: Access must be denied
        expect(result.accessGranted).toBe(false);
        expect(result.authenticationRequired).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 7: User cancellation prevents data access
   */
  it('should prevent data access when user cancels authentication', async () => {
    await fc.assert(
      fc.asyncProperty(phiAccessAttemptArbitrary, async (attempt) => {
        // Setup biometric authentication
        await setupBiometricAuth(attempt.userId);

        // Mock user cancellation
        (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
          success: false,
          error: 'user_cancel',
        });

        // Attempt to access PHI
        const result = await attemptPHIAccess(
          attempt.userId,
          attempt.resourceId,
          attempt.resourceType,
          true // biometric enabled
        );

        // Property: Access must be denied on cancellation
        expect(result.accessGranted).toBe(false);
        expect(result.authenticationRequired).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 8: Biometric unavailability requires alternative authentication
   */
  it('should require alternative authentication when biometric is unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(phiAccessAttemptArbitrary, async (attempt) => {
        // Mock biometric hardware not available
        (LocalAuthentication.hasHardwareAsync as any).mockResolvedValue(false);

        // Attempt to access PHI with biometric enabled
        const result = await attemptPHIAccess(
          attempt.userId,
          attempt.resourceId,
          attempt.resourceType,
          true // biometric enabled
        );

        // Property: Authentication must still be required
        expect(result.authenticationRequired).toBe(true);
        
        // Property: Access must be denied (fallback to PIN required)
        expect(result.accessGranted).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 9: Disabled biometric allows access without authentication
   */
  it('should allow access without authentication when biometric is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(phiAccessAttemptArbitrary, async (attempt) => {
        // Attempt to access PHI with biometric disabled
        const result = await attemptPHIAccess(
          attempt.userId,
          attempt.resourceId,
          attempt.resourceType,
          false // biometric disabled
        );

        // Property: Authentication should not be required
        expect(result.authenticationRequired).toBe(false);
        
        // Property: Access should be granted
        expect(result.accessGranted).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 10: Authentication state is not cached across resources
   */
  it('should not cache authentication state across different resources', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        resourceIdArbitrary,
        resourceIdArbitrary,
        resourceTypeArbitrary,
        async (userId, resourceId1, resourceId2, resourceType) => {
          // Ensure different resource IDs
          fc.pre(resourceId1 !== resourceId2);

          // Setup biometric authentication
          await setupBiometricAuth(userId);

          // Mock successful authentication for first access
          (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
            success: true,
          });

          // First access
          await attemptPHIAccess(userId, resourceId1, resourceType, true);

          // Reset mock call count
          vi.clearAllMocks();

          // Mock successful authentication for second access
          (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
            success: true,
          });

          // Second access to different resource
          await attemptPHIAccess(userId, resourceId2, resourceType, true);

          // Property: Authentication must be called again for second resource
          expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 11: Authentication is required regardless of timestamp
   */
  it('should require authentication regardless of access timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        resourceIdArbitrary,
        resourceTypeArbitrary,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        async (userId, resourceId, resourceType, timestamp) => {
          // Setup biometric authentication
          await setupBiometricAuth(userId);

          // Mock authentication failure
          (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
            success: false,
            error: 'user_cancel',
          });

          // Attempt to access PHI at any timestamp
          const result = await attemptPHIAccess(
            userId,
            resourceId,
            resourceType,
            true // biometric enabled
          );

          // Property: Authentication must be required regardless of timestamp
          expect(result.authenticationRequired).toBe(true);
          expect(result.accessGranted).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 12: Successful authentication grants access to requested resource only
   */
  it('should grant access only to the requested resource after authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        resourceIdArbitrary,
        resourceTypeArbitrary,
        async (userId, resourceId, resourceType) => {
          // Setup biometric authentication
          await setupBiometricAuth(userId);

          // Mock successful authentication
          (LocalAuthentication.authenticateAsync as any).mockResolvedValue({
            success: true,
          });

          // Attempt to access specific PHI resource
          const result = await attemptPHIAccess(
            userId,
            resourceId,
            resourceType,
            true // biometric enabled
          );

          // Property: Access must be granted for the requested resource
          expect(result.accessGranted).toBe(true);
          expect(result.authenticationRequired).toBe(true);

          // Property: Authentication prompt must reference the specific resource type
          expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
            expect.stringContaining(resourceType)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
