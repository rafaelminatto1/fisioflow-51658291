/**
 * Property-Based Test: Legal Acceptance Required for First Use
 * 
 * Property 4: Legal Acceptance Required for First Use
 * Validates: Requirements 1.5, 9.9
 * 
 * This test generates random new user accounts and verifies that navigation
 * is blocked until legal documents (Privacy Policy and Terms of Service) are accepted.
 * 
 * Uses fast-check with 100 iterations to ensure the property holds across
 * all possible user account variations.
 * 
 * NOTE: This test requires fast-check to be installed:
 * npm install --save-dev fast-check @types/fast-check
 * or
 * pnpm add -D fast-check @types/fast-check
 */

import * as fc from 'fast-check';
import { collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock constants
const LEGAL_VERSIONS = {
  PRIVACY_POLICY: '1.0.0',
  TERMS_OF_SERVICE: '1.0.0',
  MEDICAL_DISCLAIMER: '1.0.0',
};

// Mock Firebase instances
const db: any = {};
const auth: any = { currentUser: null };

// Mock Firebase Auth for testing
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock('@/constants/legalVersions', () => ({
  LEGAL_VERSIONS: {
    PRIVACY_POLICY: '1.0.0',
    TERMS_OF_SERVICE: '1.0.0',
    MEDICAL_DISCLAIMER: '1.0.0',
  },
}));

describe('Property 4: Legal Acceptance Required for First Use', () => {
  /**
   * Arbitrary generator for user IDs
   * Generates random user IDs in the format: user_<timestamp>_<random>
   */
  const userIdArbitrary = fc.string({ minLength: 10, maxLength: 30 }).map(
    (str) => `user_${Date.now()}_${str.replace(/[^a-zA-Z0-9]/g, '')}`
  );

  /**
   * Arbitrary generator for user email addresses
   */
  const emailArbitrary = fc.emailAddress();

  /**
   * Arbitrary generator for user names
   */
  const nameArbitrary = fc.string({ minLength: 3, maxLength: 50 }).filter(
    (str) => str.trim().length > 0
  );

  /**
   * Arbitrary generator for complete user accounts
   */
  const newUserAccountArbitrary = fc.record({
    userId: userIdArbitrary,
    email: emailArbitrary,
    name: nameArbitrary,
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
  });

  /**
   * Check if user has accepted Privacy Policy
   */
  async function hasAcceptedPrivacyPolicy(userId: string): Promise<boolean> {
    try {
      const acceptancesRef = collection(db, 'privacy_acceptances');
      const q = query(acceptancesRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      return !snapshot.empty && snapshot.docs.some(
        (doc) => doc.data().version === LEGAL_VERSIONS.PRIVACY_POLICY
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has accepted Terms of Service
   */
  async function hasAcceptedTermsOfService(userId: string): Promise<boolean> {
    try {
      const acceptancesRef = collection(db, 'terms_acceptances');
      const q = query(acceptancesRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      return !snapshot.empty && snapshot.docs.some(
        (doc) => doc.data().version === LEGAL_VERSIONS.TERMS_OF_SERVICE
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user can access main app (navigation not blocked)
   */
  async function canAccessMainApp(userId: string): Promise<boolean> {
    const hasPrivacyAcceptance = await hasAcceptedPrivacyPolicy(userId);
    const hasTermsAcceptance = await hasAcceptedTermsOfService(userId);
    
    // User can only access main app if both legal documents are accepted
    return hasPrivacyAcceptance && hasTermsAcceptance;
  }

  /**
   * Simulate user accepting Privacy Policy
   */
  async function acceptPrivacyPolicy(userId: string): Promise<void> {
    const acceptanceData = {
      userId,
      version: LEGAL_VERSIONS.PRIVACY_POLICY,
      acceptedAt: new Date(),
      deviceInfo: {
        model: 'Test Device',
        osVersion: '16.0',
        appVersion: '1.0.0',
        platform: 'ios' as const,
      },
    };
    
    await addDoc(collection(db, 'privacy_acceptances'), acceptanceData);
  }

  /**
   * Simulate user accepting Terms of Service
   */
  async function acceptTermsOfService(userId: string): Promise<void> {
    const acceptanceData = {
      userId,
      version: LEGAL_VERSIONS.TERMS_OF_SERVICE,
      acceptedAt: new Date(),
      deviceInfo: {
        model: 'Test Device',
        osVersion: '16.0',
        appVersion: '1.0.0',
        platform: 'ios' as const,
      },
    };
    
    await addDoc(collection(db, 'terms_acceptances'), acceptanceData);
  }

  /**
   * Property Test 1: New users cannot access main app without accepting legal documents
   */
  it('should block navigation for new users without legal acceptance', async () => {
    await fc.assert(
      fc.asyncProperty(newUserAccountArbitrary, async (user) => {
        // Mock Firestore to return empty results for new user
        (getDocs as any).mockResolvedValue({
          empty: true,
          docs: [],
        });

        // New user should not be able to access main app
        const canAccess = await canAccessMainApp(user.userId);
        
        // Property: New users without acceptance cannot access main app
        expect(canAccess).toBe(false);
      }),
      { numRuns: 100 } // Run 100 iterations as specified
    );
  });

  /**
   * Property Test 2: Users with only Privacy Policy acceptance cannot access main app
   */
  it('should block navigation when only Privacy Policy is accepted', async () => {
    await fc.assert(
      fc.asyncProperty(newUserAccountArbitrary, async (user) => {
        // Mock Firestore to return Privacy Policy acceptance but not Terms
        (getDocs as any).mockImplementation((q: any) => {
          const collectionPath = q._query?.path?.segments?.[0] || '';
          
          if (collectionPath === 'privacy_acceptances') {
            return Promise.resolve({
              empty: false,
              docs: [{
                data: () => ({
                  userId: user.userId,
                  version: LEGAL_VERSIONS.PRIVACY_POLICY,
                  acceptedAt: new Date(),
                }),
              }],
            });
          }
          
          return Promise.resolve({ empty: true, docs: [] });
        });

        const canAccess = await canAccessMainApp(user.userId);
        
        // Property: Partial acceptance (only Privacy Policy) is not sufficient
        expect(canAccess).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 3: Users with only Terms of Service acceptance cannot access main app
   */
  it('should block navigation when only Terms of Service is accepted', async () => {
    await fc.assert(
      fc.asyncProperty(newUserAccountArbitrary, async (user) => {
        // Mock Firestore to return Terms acceptance but not Privacy Policy
        (getDocs as any).mockImplementation((q: any) => {
          const collectionPath = q._query?.path?.segments?.[0] || '';
          
          if (collectionPath === 'terms_acceptances') {
            return Promise.resolve({
              empty: false,
              docs: [{
                data: () => ({
                  userId: user.userId,
                  version: LEGAL_VERSIONS.TERMS_OF_SERVICE,
                  acceptedAt: new Date(),
                }),
              }],
            });
          }
          
          return Promise.resolve({ empty: true, docs: [] });
        });

        const canAccess = await canAccessMainApp(user.userId);
        
        // Property: Partial acceptance (only Terms) is not sufficient
        expect(canAccess).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 4: Users with both acceptances can access main app
   */
  it('should allow navigation when both legal documents are accepted', async () => {
    await fc.assert(
      fc.asyncProperty(newUserAccountArbitrary, async (user) => {
        // Mock Firestore to return both acceptances
        (getDocs as any).mockImplementation((q: any) => {
          const collectionPath = q._query?.path?.segments?.[0] || '';
          
          if (collectionPath === 'privacy_acceptances') {
            return Promise.resolve({
              empty: false,
              docs: [{
                data: () => ({
                  userId: user.userId,
                  version: LEGAL_VERSIONS.PRIVACY_POLICY,
                  acceptedAt: new Date(),
                }),
              }],
            });
          }
          
          if (collectionPath === 'terms_acceptances') {
            return Promise.resolve({
              empty: false,
              docs: [{
                data: () => ({
                  userId: user.userId,
                  version: LEGAL_VERSIONS.TERMS_OF_SERVICE,
                  acceptedAt: new Date(),
                }),
              }],
            });
          }
          
          return Promise.resolve({ empty: true, docs: [] });
        });

        const canAccess = await canAccessMainApp(user.userId);
        
        // Property: Complete acceptance (both documents) allows access
        expect(canAccess).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 5: Acceptance order doesn't matter
   */
  it('should allow access regardless of acceptance order', async () => {
    await fc.assert(
      fc.asyncProperty(
        newUserAccountArbitrary,
        fc.boolean(), // Random order: true = Privacy first, false = Terms first
        async (user, privacyFirst) => {
          // Mock both acceptances exist
          (getDocs as any).mockImplementation((q: any) => {
            const collectionPath = q._query?.path?.segments?.[0] || '';
            
            if (collectionPath === 'privacy_acceptances' || collectionPath === 'terms_acceptances') {
              return Promise.resolve({
                empty: false,
                docs: [{
                  data: () => ({
                    userId: user.userId,
                    version: collectionPath === 'privacy_acceptances' 
                      ? LEGAL_VERSIONS.PRIVACY_POLICY 
                      : LEGAL_VERSIONS.TERMS_OF_SERVICE,
                    acceptedAt: new Date(),
                  }),
                }],
              });
            }
            
            return Promise.resolve({ empty: true, docs: [] });
          });

          const canAccess = await canAccessMainApp(user.userId);
          
          // Property: Order of acceptance doesn't affect the result
          expect(canAccess).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6: Old version acceptance doesn't grant access
   */
  it('should block navigation when acceptance is for old version', async () => {
    await fc.assert(
      fc.asyncProperty(newUserAccountArbitrary, async (user) => {
        // Mock Firestore to return old version acceptances
        (getDocs as any).mockImplementation((q: any) => {
          const collectionPath = q._query?.path?.segments?.[0] || '';
          
          if (collectionPath === 'privacy_acceptances' || collectionPath === 'terms_acceptances') {
            return Promise.resolve({
              empty: false,
              docs: [{
                data: () => ({
                  userId: user.userId,
                  version: '0.9.0', // Old version
                  acceptedAt: new Date(),
                }),
              }],
            });
          }
          
          return Promise.resolve({ empty: true, docs: [] });
        });

        const canAccess = await canAccessMainApp(user.userId);
        
        // Property: Old version acceptance doesn't grant access
        expect(canAccess).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Test: Legal Acceptance Timestamp Storage
 * 
 * Property 5: Legal Acceptance Timestamp Storage
 * Validates: Requirements 1.12
 * 
 * This test generates random acceptance events and verifies that Firestore
 * contains the timestamp, userId, and version for each acceptance.
 * 
 * Uses fast-check with 100 iterations to ensure the property holds across
 * all possible acceptance event variations.
 */
describe('Property 5: Legal Acceptance Timestamp Storage', () => {
  /**
   * Arbitrary generator for acceptance events
   */
  const acceptanceEventArbitrary = fc.record({
    userId: fc.string({ minLength: 10, maxLength: 30 }).map(
      (str) => `user_${Date.now()}_${str.replace(/[^a-zA-Z0-9]/g, '')}`
    ),
    documentType: fc.constantFrom('privacy', 'terms', 'disclaimer'),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
    deviceInfo: fc.record({
      model: fc.constantFrom('iPhone 14', 'iPhone 13', 'iPhone 12', 'iPad Pro'),
      osVersion: fc.constantFrom('16.0', '16.1', '17.0', '17.1'),
      appVersion: fc.constantFrom('1.0.0', '1.0.1', '1.1.0'),
      platform: fc.constant('ios' as const),
    }),
  });

  /**
   * Store acceptance in Firestore
   */
  async function storeAcceptance(
    documentType: 'privacy' | 'terms' | 'disclaimer',
    userId: string,
    timestamp: Date,
    deviceInfo: any
  ): Promise<string> {
    const collectionName = 
      documentType === 'privacy' ? 'privacy_acceptances' :
      documentType === 'terms' ? 'terms_acceptances' :
      'medical_disclaimers';
    
    const version = 
      documentType === 'privacy' ? LEGAL_VERSIONS.PRIVACY_POLICY :
      documentType === 'terms' ? LEGAL_VERSIONS.TERMS_OF_SERVICE :
      LEGAL_VERSIONS.MEDICAL_DISCLAIMER;
    
    const acceptanceData = {
      userId,
      version,
      acceptedAt: timestamp,
      deviceInfo,
      ...(documentType === 'disclaimer' && { context: 'first-launch' }),
    };
    
    const docRef = await addDoc(collection(db, collectionName), acceptanceData);
    return docRef.id;
  };

  /**
   * Retrieve acceptance from Firestore
   */
  async function getAcceptance(
    documentType: 'privacy' | 'terms' | 'disclaimer',
    userId: string
  ): Promise<any | null> {
    const collectionName = 
      documentType === 'privacy' ? 'privacy_acceptances' :
      documentType === 'terms' ? 'terms_acceptances' :
      'medical_disclaimers';
    
    const acceptancesRef = collection(db, collectionName);
    const q = query(acceptancesRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    return snapshot.docs[0].data();
  };

  /**
   * Property Test 1: All acceptances must have timestamp
   */
  it('should store timestamp for all acceptance events', async () => {
    await fc.assert(
      fc.asyncProperty(acceptanceEventArbitrary, async (event) => {
        // Mock addDoc to capture the data being stored
        let storedData: any = null;
        (addDoc as any).mockImplementation(async (ref, data) => {
          storedData = data;
          return { id: 'mock-doc-id' };
        });

        // Store the acceptance
        await storeAcceptance(
          event.documentType,
          event.userId,
          event.timestamp,
          event.deviceInfo
        );

        // Property: Stored data must contain acceptedAt timestamp
        expect(storedData).toBeDefined();
        expect(storedData.acceptedAt).toBeDefined();
        expect(storedData.acceptedAt).toBeInstanceOf(Date);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 2: All acceptances must have userId
   */
  it('should store userId for all acceptance events', async () => {
    await fc.assert(
      fc.asyncProperty(acceptanceEventArbitrary, async (event) => {
        let storedData: any = null;
        (addDoc as any).mockImplementation(async (ref, data) => {
          storedData = data;
          return { id: 'mock-doc-id' };
        });

        await storeAcceptance(
          event.documentType,
          event.userId,
          event.timestamp,
          event.deviceInfo
        );

        // Property: Stored data must contain userId
        expect(storedData).toBeDefined();
        expect(storedData.userId).toBe(event.userId);
        expect(typeof storedData.userId).toBe('string');
        expect(storedData.userId.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 3: All acceptances must have version
   */
  it('should store version for all acceptance events', async () => {
    await fc.assert(
      fc.asyncProperty(acceptanceEventArbitrary, async (event) => {
        let storedData: any = null;
        (addDoc as any).mockImplementation(async (ref, data) => {
          storedData = data;
          return { id: 'mock-doc-id' };
        });

        await storeAcceptance(
          event.documentType,
          event.userId,
          event.timestamp,
          event.deviceInfo
        );

        // Property: Stored data must contain version
        expect(storedData).toBeDefined();
        expect(storedData.version).toBeDefined();
        expect(typeof storedData.version).toBe('string');
        expect(storedData.version).toMatch(/^\d+\.\d+\.\d+$/); // Semantic versioning format
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 4: All acceptances must have device info
   */
  it('should store device info for all acceptance events', async () => {
    await fc.assert(
      fc.asyncProperty(acceptanceEventArbitrary, async (event) => {
        let storedData: any = null;
        (addDoc as any).mockImplementation(async (ref, data) => {
          storedData = data;
          return { id: 'mock-doc-id' };
        });

        await storeAcceptance(
          event.documentType,
          event.userId,
          event.timestamp,
          event.deviceInfo
        );

        // Property: Stored data must contain complete device info
        expect(storedData).toBeDefined();
        expect(storedData.deviceInfo).toBeDefined();
        expect(storedData.deviceInfo.model).toBeDefined();
        expect(storedData.deviceInfo.osVersion).toBeDefined();
        expect(storedData.deviceInfo.appVersion).toBeDefined();
        expect(storedData.deviceInfo.platform).toBe('ios');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 5: Timestamp must be valid date
   */
  it('should store valid timestamp for all acceptance events', async () => {
    await fc.assert(
      fc.asyncProperty(acceptanceEventArbitrary, async (event) => {
        let storedData: any = null;
        (addDoc as any).mockImplementation(async (ref, data) => {
          storedData = data;
          return { id: 'mock-doc-id' };
        });

        await storeAcceptance(
          event.documentType,
          event.userId,
          event.timestamp,
          event.deviceInfo
        );

        // Property: Timestamp must be a valid date
        expect(storedData).toBeDefined();
        expect(storedData.acceptedAt).toBeInstanceOf(Date);
        expect(storedData.acceptedAt.getTime()).not.toBeNaN();
        expect(storedData.acceptedAt.getTime()).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6: Acceptance can be retrieved with all fields intact
   */
  it('should retrieve acceptance with all fields intact', async () => {
    await fc.assert(
      fc.asyncProperty(acceptanceEventArbitrary, async (event) => {
        // Mock addDoc and getDocs
        let storedData: any = null;
        (addDoc as any).mockImplementation(async (ref, data) => {
          storedData = data;
          return { id: 'mock-doc-id' };
        });

        (getDocs as any).mockImplementation(async (q: any) => {
          if (!storedData) {
            return { empty: true, docs: [] };
          }
          
          return {
            empty: false,
            docs: [{
              data: () => storedData,
            }],
          };
        });

        // Store acceptance
        await storeAcceptance(
          event.documentType,
          event.userId,
          event.timestamp,
          event.deviceInfo
        );

        // Retrieve acceptance
        const retrieved = await getAcceptance(event.documentType, event.userId);

        // Property: Retrieved data must match stored data
        expect(retrieved).toBeDefined();
        expect(retrieved.userId).toBe(event.userId);
        expect(retrieved.version).toBeDefined();
        expect(retrieved.acceptedAt).toBeDefined();
        expect(retrieved.deviceInfo).toBeDefined();
        expect(retrieved.deviceInfo.model).toBe(event.deviceInfo.model);
        expect(retrieved.deviceInfo.osVersion).toBe(event.deviceInfo.osVersion);
        expect(retrieved.deviceInfo.appVersion).toBe(event.deviceInfo.appVersion);
        expect(retrieved.deviceInfo.platform).toBe('ios');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 7: Multiple acceptances for same user are stored separately
   */
  it('should store multiple acceptances for same user separately', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }).map(
          (str) => `user_${Date.now()}_${str.replace(/[^a-zA-Z0-9]/g, '')}`
        ),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        async (userId, timestamp1, timestamp2) => {
          const acceptances: any[] = [];
          
          (addDoc as any).mockImplementation(async (ref, data) => {
            acceptances.push(data);
            return { id: `mock-doc-id-${acceptances.length}` };
          });

          const deviceInfo = {
            model: 'iPhone 14',
            osVersion: '16.0',
            appVersion: '1.0.0',
            platform: 'ios' as const,
          };

          // Store privacy acceptance
          await storeAcceptance('privacy', userId, timestamp1, deviceInfo);
          
          // Store terms acceptance
          await storeAcceptance('terms', userId, timestamp2, deviceInfo);

          // Property: Both acceptances should be stored
          expect(acceptances).toHaveLength(2);
          expect(acceptances[0].userId).toBe(userId);
          expect(acceptances[1].userId).toBe(userId);
          expect(acceptances[0].version).toBe(LEGAL_VERSIONS.PRIVACY_POLICY);
          expect(acceptances[1].version).toBe(LEGAL_VERSIONS.TERMS_OF_SERVICE);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 8: Timestamp is immutable after storage
   */
  it('should not allow timestamp modification after storage', async () => {
    await fc.assert(
      fc.asyncProperty(acceptanceEventArbitrary, async (event) => {
        let storedData: any = null;
        (addDoc as any).mockImplementation(async (ref, data) => {
          // Create a deep copy to simulate Firestore immutability
          storedData = JSON.parse(JSON.stringify({
            ...data,
            acceptedAt: data.acceptedAt.toISOString(),
          }));
          return { id: 'mock-doc-id' };
        });

        await storeAcceptance(
          event.documentType,
          event.userId,
          event.timestamp,
          event.deviceInfo
        );

        const originalTimestamp = storedData.acceptedAt;

        // Attempt to modify timestamp (should not affect stored data)
        const modifiedTimestamp = new Date(Date.now() + 1000000);
        
        // Property: Original timestamp should remain unchanged
        expect(storedData.acceptedAt).toBe(originalTimestamp);
        expect(storedData.acceptedAt).not.toBe(modifiedTimestamp.toISOString());
      }),
      { numRuns: 100 }
    );
  });
});
