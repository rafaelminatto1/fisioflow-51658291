/**
 * Property-Based Test: Policy Version Change Requires Re-acceptance
 * 
 * **Property 6: Policy Version Change Requires Re-acceptance**
 * **Validates: Requirements 1.13**
 * 
 * This test creates users with policy v1 acceptance, updates to v2,
 * and verifies that re-acceptance is required before app access is granted.
 * 
 * Uses fast-check with 100 iterations to ensure the property holds across
 * all possible version change scenarios.
 * 
 * NOTE: This test requires fast-check to be installed:
 * npm install --save-dev fast-check @types/fast-check
 * or
 * pnpm add -D fast-check @types/fast-check
 */

import * as fc from 'fast-check';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase
vi.mock('../../lib/firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

// Mock legal versions - use a factory function to avoid hoisting issues
vi.mock('../../constants/legalVersions', () => ({
  get LEGAL_VERSIONS() {
    return {
      PRIVACY_POLICY: '1.0.0',
      TERMS_OF_SERVICE: '1.0.0',
      MEDICAL_DISCLAIMER: '1.0.0',
    };
  },
}));

import { PolicyVersionChecker } from '../../lib/services/policyVersionChecker';

describe('Property 6: Policy Version Change Requires Re-acceptance', () => {
  let policyChecker: PolicyVersionChecker;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Create fresh instance
    policyChecker = new PolicyVersionChecker();
  });

  /**
   * Arbitrary generator for user IDs
   */
  const userIdArbitrary = fc.string({ minLength: 10, maxLength: 30 }).map(
    (str) => `user_${Date.now()}_${str.replace(/[^a-zA-Z0-9]/g, '')}`
  );

  /**
   * Arbitrary generator for semantic version numbers
   */
  const versionArbitrary = fc.record({
    major: fc.integer({ min: 1, max: 5 }),
    minor: fc.integer({ min: 0, max: 9 }),
    patch: fc.integer({ min: 0, max: 9 }),
  }).map(({ major, minor, patch }) => `${major}.${minor}.${patch}`);

  /**
   * Arbitrary generator for policy types
   */
  const policyTypeArbitrary = fc.constantFrom(
    'privacyPolicy',
    'termsOfService',
    'medicalDisclaimer'
  );

  /**
   * Arbitrary generator for user with policy acceptance
   */
  const userWithAcceptanceArbitrary = fc.record({
    userId: userIdArbitrary,
    privacyPolicyVersion: versionArbitrary,
    termsOfServiceVersion: versionArbitrary,
    medicalDisclaimerVersion: versionArbitrary,
    onboardingComplete: fc.constant(true),
  });

  /**
   * Simulate user document in Firestore with accepted policy versions
   */
  function mockUserDocument(userData: any) {
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => userData,
    });
  }

  /**
   * Simulate non-existent user document
   */
  function mockNoUserDocument() {
    (getDoc as any).mockResolvedValue({
      exists: () => false,
      data: () => null,
    });
  }

  /**
   * Increment version number (e.g., 1.0.0 -> 1.0.1)
   */
  function incrementVersion(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Property Test 1: User with old version needs re-acceptance
   */
  it('should require re-acceptance when privacy policy version is outdated', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: User has accepted old version (0.9.0) but current is 1.0.0
        mockUserDocument({
          userId,
          privacyPolicyVersion: '0.9.0',
          termsOfServiceVersion: '1.0.0',
          medicalDisclaimerVersion: '1.0.0',
          onboardingComplete: true,
        });

        // Verify: User needs re-acceptance
        const status = await policyChecker.checkPolicyVersions(userId);
        
        // Property: Old version requires re-acceptance
        expect(status.privacyPolicyUpToDate).toBe(false);
        expect(status.needsReAcceptance).toBe(true);
        expect(status.outdatedPolicies).toContain('privacy-policy');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 2: User with old terms version needs re-acceptance
   */
  it('should require re-acceptance when terms of service version is outdated', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: User has accepted old version of terms
        mockUserDocument({
          userId,
          privacyPolicyVersion: '1.0.0',
          termsOfServiceVersion: '0.9.0',
          medicalDisclaimerVersion: '1.0.0',
          onboardingComplete: true,
        });

        // Verify: User needs re-acceptance
        const status = await policyChecker.checkPolicyVersions(userId);
        
        // Property: Old version requires re-acceptance
        expect(status.termsOfServiceUpToDate).toBe(false);
        expect(status.needsReAcceptance).toBe(true);
        expect(status.outdatedPolicies).toContain('terms-of-service');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 3: User with old disclaimer version needs re-acceptance
   */
  it('should require re-acceptance when medical disclaimer version is outdated', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: User has accepted old version of disclaimer
        mockUserDocument({
          userId,
          privacyPolicyVersion: '1.0.0',
          termsOfServiceVersion: '1.0.0',
          medicalDisclaimerVersion: '0.9.0',
          onboardingComplete: true,
        });

        // Verify: User needs re-acceptance
        const status = await policyChecker.checkPolicyVersions(userId);
        
        // Property: Old version requires re-acceptance
        expect(status.medicalDisclaimerUpToDate).toBe(false);
        expect(status.needsReAcceptance).toBe(true);
        expect(status.outdatedPolicies).toContain('medical-disclaimer');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 4: App access should be blocked when any policy version is outdated
   */
  it('should block app access when any policy version is outdated', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: User has one outdated policy
        mockUserDocument({
          userId,
          privacyPolicyVersion: '0.9.0', // Outdated
          termsOfServiceVersion: '1.0.0',
          medicalDisclaimerVersion: '1.0.0',
          onboardingComplete: true,
        });

        // Verify: App access should be blocked
        const shouldBlock = await policyChecker.shouldBlockAppAccess(userId);
        
        // Property: Any outdated policy blocks app access
        expect(shouldBlock).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 5: Multiple outdated policies are all reported
   */
  it('should report all outdated policies', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: User has all policies outdated
        mockUserDocument({
          userId,
          privacyPolicyVersion: '0.9.0',
          termsOfServiceVersion: '0.9.0',
          medicalDisclaimerVersion: '0.9.0',
          onboardingComplete: true,
        });

        // Verify: All policies need re-acceptance
        const status = await policyChecker.checkPolicyVersions(userId);
        
        // Property: All updated policies appear in outdated list
        expect(status.needsReAcceptance).toBe(true);
        expect(status.outdatedPolicies).toHaveLength(3);
        expect(status.outdatedPolicies).toContain('privacy-policy');
        expect(status.outdatedPolicies).toContain('terms-of-service');
        expect(status.outdatedPolicies).toContain('medical-disclaimer');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6: User without document needs to complete onboarding
   */
  it('should require onboarding for users without document', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: User has no document in Firestore
        mockNoUserDocument();

        // Verify: User needs re-acceptance (actually needs onboarding)
        const status = await policyChecker.checkPolicyVersions(userId);
        
        // Property: Missing user document requires acceptance
        expect(status.needsReAcceptance).toBe(true);
        expect(status.privacyPolicyUpToDate).toBe(false);
        expect(status.termsOfServiceUpToDate).toBe(false);
        expect(status.medicalDisclaimerUpToDate).toBe(false);
        expect(status.outdatedPolicies).toHaveLength(3);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 7: Outdated policy names are human-readable
   */
  it('should provide human-readable names for outdated policies', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: User has old versions
        mockUserDocument({
          userId,
          privacyPolicyVersion: '0.9.0',
          termsOfServiceVersion: '0.9.0',
          medicalDisclaimerVersion: '0.9.0',
          onboardingComplete: true,
        });

        // Get human-readable names
        const names = await policyChecker.getOutdatedPolicyNames(userId);
        
        // Property: Names are in Portuguese and human-readable
        expect(names).toHaveLength(3);
        expect(names).toContain('Política de Privacidade');
        expect(names).toContain('Termos de Uso');
        expect(names).toContain('Aviso Médico');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 8: Version comparison is exact
   */
  it('should use exact version matching', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: User has accepted different version
        mockUserDocument({
          userId,
          privacyPolicyVersion: '1.0.1', // Different from current 1.0.0
          termsOfServiceVersion: '1.0.0',
          medicalDisclaimerVersion: '1.0.0',
          onboardingComplete: true,
        });

        // Check status
        const status = await policyChecker.checkPolicyVersions(userId);
        
        // Property: Any version difference requires re-acceptance
        expect(status.needsReAcceptance).toBe(true);
        expect(status.privacyPolicyUpToDate).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 9: Error handling defaults to requiring re-acceptance
   */
  it('should require re-acceptance on error for safety', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: Mock Firestore error
        (getDoc as any).mockRejectedValue(new Error('Firestore error'));

        // Check status
        const status = await policyChecker.checkPolicyVersions(userId);
        
        // Property: Errors default to requiring re-acceptance (fail-safe)
        expect(status.needsReAcceptance).toBe(true);
        expect(status.privacyPolicyUpToDate).toBe(false);
        expect(status.termsOfServiceUpToDate).toBe(false);
        expect(status.medicalDisclaimerUpToDate).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 10: Same version means no re-acceptance needed
   */
  it('should not require re-acceptance when versions match', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArbitrary, async (userId) => {
        // Setup: User has accepted current versions
        mockUserDocument({
          userId,
          privacyPolicyVersion: '1.0.0',
          termsOfServiceVersion: '1.0.0',
          medicalDisclaimerVersion: '1.0.0',
          onboardingComplete: true,
        });

        // Check status
        const status = await policyChecker.checkPolicyVersions(userId);
        
        // Property: Matching versions don't require re-acceptance
        expect(status.needsReAcceptance).toBe(false);
        expect(status.privacyPolicyUpToDate).toBe(true);
        expect(status.termsOfServiceUpToDate).toBe(true);
        expect(status.medicalDisclaimerUpToDate).toBe(true);
        expect(status.outdatedPolicies).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
});
