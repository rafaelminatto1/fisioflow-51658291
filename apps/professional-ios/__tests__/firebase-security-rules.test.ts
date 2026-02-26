/**
 * Firebase Security Rules Tests
 * 
 * Tests for Firestore and Storage security rules to ensure PHI protection
 * and proper access control for the FisioFlow Professional iOS app.
 * 
 * Requirements: 2.3, 2.4 (PHI Data Protection and Encryption)
 * 
 * These tests verify:
 * - Unauthorized access is denied
 * - Owners can read/write their own data
 * - File size limits are enforced (50MB for PHI)
 * - Cross-user access is prevented
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { assertStorageFails, getAuthedStorage } from './helpers/storageTestHelpers';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
} from 'firebase/firestore';

// Test environment
let testEnv: RulesTestEnvironment;

// Test user IDs
const USER_ID_1 = 'user1';
const USER_ID_2 = 'user2';
const PATIENT_ID_1 = 'patient1';
const PATIENT_ID_2 = 'patient2';

describe('Firebase Security Rules - Firestore', () => {
  beforeAll(async () => {
    // Initialize test environment with actual rules
    testEnv = await initializeTestEnvironment({
      projectId: 'fisioflow-test',
      firestore: {
        rules: readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8'),
        host: 'localhost',
        port: 8080,
      },
      storage: {
        rules: readFileSync(resolve(__dirname, '../../../storage.rules'), 'utf8'),
        host: 'localhost',
        port: 9199,
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
  });

  describe('User Consents Collection', () => {
    it('should deny read access to unauthenticated users', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      const consentRef = doc(unauthedDb, 'user_consents', 'consent1');

      await assertFails(getDoc(consentRef));
    });

    it('should allow user to read their own consents', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      
      // First create the consent document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'user_consents', 'consent1'), {
          userId: USER_ID_1,
          type: 'required',
          category: 'legal',
          name: 'Privacy Policy',
          status: 'granted',
          grantedAt: new Date(),
          version: '1.0.0',
        });
      });

      const consentRef = doc(authedDb, 'user_consents', 'consent1');
      await assertSucceeds(getDoc(consentRef));
    });

    it('should deny user from reading another user\'s consents', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_2).firestore();
      
      // Create consent for USER_ID_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'user_consents', 'consent1'), {
          userId: USER_ID_1,
          type: 'required',
          category: 'legal',
          name: 'Privacy Policy',
          status: 'granted',
          grantedAt: new Date(),
          version: '1.0.0',
        });
      });

      const consentRef = doc(authedDb, 'user_consents', 'consent1');
      await assertFails(getDoc(consentRef));
    });

    it('should allow user to create their own consent', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      const consentRef = doc(authedDb, 'user_consents', 'consent1');

      await assertSucceeds(
        setDoc(consentRef, {
          userId: USER_ID_1,
          type: 'required',
          category: 'legal',
          name: 'Privacy Policy',
          status: 'granted',
          grantedAt: new Date(),
          version: '1.0.0',
        })
      );
    });

    it('should deny user from creating consent for another user', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_2).firestore();
      const consentRef = doc(authedDb, 'user_consents', 'consent1');

      await assertFails(
        setDoc(consentRef, {
          userId: USER_ID_1, // Trying to create for USER_ID_1
          type: 'required',
          category: 'legal',
          name: 'Privacy Policy',
          status: 'granted',
          grantedAt: new Date(),
          version: '1.0.0',
        })
      );
    });

    it('should deny deletion of consents (compliance requirement)', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      
      // Create consent first
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'user_consents', 'consent1'), {
          userId: USER_ID_1,
          type: 'required',
          category: 'legal',
          name: 'Privacy Policy',
          status: 'granted',
          grantedAt: new Date(),
          version: '1.0.0',
        });
      });

      const consentRef = doc(authedDb, 'user_consents', 'consent1');
      await assertFails(deleteDoc(consentRef));
    });
  });

  describe('Audit Logs Collection', () => {
    it('should allow user to read their own audit logs', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      
      // Create audit log
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'audit_logs', 'log1'), {
          userId: USER_ID_1,
          timestamp: new Date(),
          action: 'login',
          resourceType: 'patient',
          deviceInfo: {
            model: 'iPhone 14',
            osVersion: '17.0',
            appVersion: '1.0.0',
          },
        });
      });

      const logRef = doc(authedDb, 'audit_logs', 'log1');
      await assertSucceeds(getDoc(logRef));
    });

    it('should deny user from reading another user\'s audit logs', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_2).firestore();
      
      // Create audit log for USER_ID_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'audit_logs', 'log1'), {
          userId: USER_ID_1,
          timestamp: new Date(),
          action: 'login',
          resourceType: 'patient',
          deviceInfo: {
            model: 'iPhone 14',
            osVersion: '17.0',
            appVersion: '1.0.0',
          },
        });
      });

      const logRef = doc(authedDb, 'audit_logs', 'log1');
      await assertFails(getDoc(logRef));
    });

    it('should allow user to create their own audit log', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      const logRef = doc(authedDb, 'audit_logs', 'log1');

      await assertSucceeds(
        setDoc(logRef, {
          userId: USER_ID_1,
          timestamp: new Date(),
          action: 'login',
          resourceType: 'patient',
          deviceInfo: {
            model: 'iPhone 14',
            osVersion: '17.0',
            appVersion: '1.0.0',
          },
        })
      );
    });

    it('should deny updates to audit logs (immutable requirement)', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      
      // Create audit log first
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'audit_logs', 'log1'), {
          userId: USER_ID_1,
          timestamp: new Date(),
          action: 'login',
          resourceType: 'patient',
          deviceInfo: {
            model: 'iPhone 14',
            osVersion: '17.0',
            appVersion: '1.0.0',
          },
        });
      });

      const logRef = doc(authedDb, 'audit_logs', 'log1');
      await assertFails(
        updateDoc(logRef, {
          action: 'logout',
        })
      );
    });

    it('should deny deletion of audit logs (immutable requirement)', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      
      // Create audit log first
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'audit_logs', 'log1'), {
          userId: USER_ID_1,
          timestamp: new Date(),
          action: 'login',
          resourceType: 'patient',
          deviceInfo: {
            model: 'iPhone 14',
            osVersion: '17.0',
            appVersion: '1.0.0',
          },
        });
      });

      const logRef = doc(authedDb, 'audit_logs', 'log1');
      await assertFails(deleteDoc(logRef));
    });
  });

  describe('Privacy Policy Acceptances Collection', () => {
    it('should allow user to create their own privacy acceptance', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      const acceptanceRef = doc(authedDb, 'privacy_acceptances', 'acceptance1');

      await assertSucceeds(
        setDoc(acceptanceRef, {
          userId: USER_ID_1,
          version: '1.0.0',
          acceptedAt: new Date(),
          ipAddress: '192.168.1.1',
          deviceInfo: {
            model: 'iPhone 14',
            osVersion: '17.0',
            appVersion: '1.0.0',
            platform: 'ios',
          },
        })
      );
    });

    it('should deny updates to privacy acceptances (immutable)', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      
      // Create acceptance first
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'privacy_acceptances', 'acceptance1'), {
          userId: USER_ID_1,
          version: '1.0.0',
          acceptedAt: new Date(),
          ipAddress: '192.168.1.1',
          deviceInfo: {
            model: 'iPhone 14',
            osVersion: '17.0',
            appVersion: '1.0.0',
            platform: 'ios',
          },
        });
      });

      const acceptanceRef = doc(authedDb, 'privacy_acceptances', 'acceptance1');
      await assertFails(
        updateDoc(acceptanceRef, {
          version: '2.0.0',
        })
      );
    });
  });

  describe('Biometric Configs Collection', () => {
    it('should allow user to read their own biometric config', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      
      // Create config
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'biometric_configs', 'config1'), {
          userId: USER_ID_1,
          enabled: true,
          type: 'faceId',
          fallbackEnabled: true,
          requireOnLaunch: true,
          requireAfterBackground: true,
          backgroundTimeout: 300,
          failedAttempts: 0,
        });
      });

      const configRef = doc(authedDb, 'biometric_configs', 'config1');
      await assertSucceeds(getDoc(configRef));
    });

    it('should allow user to update their own biometric config', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      
      // Create config first
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'biometric_configs', 'config1'), {
          userId: USER_ID_1,
          enabled: true,
          type: 'faceId',
          fallbackEnabled: true,
          requireOnLaunch: true,
          requireAfterBackground: true,
          backgroundTimeout: 300,
          failedAttempts: 0,
        });
      });

      const configRef = doc(authedDb, 'biometric_configs', 'config1');
      await assertSucceeds(
        updateDoc(configRef, {
          enabled: false,
        })
      );
    });

    it('should deny user from accessing another user\'s biometric config', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_2).firestore();
      
      // Create config for USER_ID_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'biometric_configs', 'config1'), {
          userId: USER_ID_1,
          enabled: true,
          type: 'faceId',
          fallbackEnabled: true,
          requireOnLaunch: true,
          requireAfterBackground: true,
          backgroundTimeout: 300,
          failedAttempts: 0,
        });
      });

      const configRef = doc(authedDb, 'biometric_configs', 'config1');
      await assertFails(getDoc(configRef));
    });
  });

  describe('Document Size Validation', () => {
    it('should enforce 1MB document size limit', async () => {
      const authedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
      const consentRef = doc(authedDb, 'user_consents', 'consent1');

      // Create a document larger than 1MB
      const largeData = {
        userId: USER_ID_1,
        type: 'required',
        category: 'legal',
        name: 'Privacy Policy',
        status: 'granted',
        grantedAt: new Date(),
        version: '1.0.0',
        // Add large field to exceed 1MB
        largeField: 'x'.repeat(1100000), // 1.1MB of data
      };

      let error: any = null;
      try {
        await setDoc(consentRef, largeData);
      } catch (err) {
        error = err;
      }

      expect(error).toBeTruthy();
      const code = error?.code || error?.message;
      const isPermission = code === 'permission-denied' || String(code).includes('PERMISSION_DENIED');
      const isInvalidArg = code === 'invalid-argument' || String(code).includes('INVALID_ARGUMENT');
      expect(isPermission || isInvalidArg).toBe(true);
    });
  });
});

describe('Firebase Security Rules - Storage', () => {
  const authedStorageFor = (userId: string) => getAuthedStorage(testEnv, userId);

  beforeAll(async () => {
    if (!testEnv) {
      testEnv = await initializeTestEnvironment({
        projectId: 'fisioflow-test',
        firestore: {
          rules: readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8'),
          host: 'localhost',
          port: 8080,
        },
        storage: {
          rules: readFileSync(resolve(__dirname, '../../../storage.rules'), 'utf8'),
          host: 'localhost',
          port: 9199,
        },
      });
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearStorage();
      await testEnv.clearFirestore();
    }
  });

  describe('Patient Photos (PHI)', () => {
    it('should deny unauthenticated access to patient photos', async () => {
      const unauthedStorage = testEnv.unauthenticatedContext().storage();
      const photoRef = unauthedStorage.ref(`patients/${PATIENT_ID_1}/photos/photo1/image.jpg`);

      await assertStorageFails(photoRef.getDownloadURL());
    });

    it('should allow owner to upload patient photo', async () => {
      const authedStorage = authedStorageFor(USER_ID_1);
      
      // First create patient document with userId
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'patients', PATIENT_ID_1), {
          userId: USER_ID_1,
          name: 'Test Patient',
          email: 'patient@test.com',
        });
      });

      const photoRef = authedStorage.ref(`patients/${PATIENT_ID_1}/photos/photo1/image.jpg`);
      const imageData = new Uint8Array(1 * 1024 * 1024); // 1MB

      await assertSucceeds(photoRef.put(imageData, { contentType: 'image/jpeg' }));
    });

    it('should deny non-owner from accessing patient photos', async () => {
      const authedStorage = authedStorageFor(USER_ID_2);
      
      // Create patient owned by USER_ID_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'patients', PATIENT_ID_1), {
          userId: USER_ID_1,
          name: 'Test Patient',
          email: 'patient@test.com',
        });
      });

      const photoRef = authedStorage.ref(`patients/${PATIENT_ID_1}/photos/photo1/image.jpg`);

      await assertStorageFails(photoRef.getDownloadURL());
    });

    it('should enforce 50MB file size limit for PHI', async () => {
      const authedStorage = authedStorageFor(USER_ID_1);
      
      // Create patient document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'patients', PATIENT_ID_1), {
          userId: USER_ID_1,
          name: 'Test Patient',
          email: 'patient@test.com',
        });
      });

      const photoRef = authedStorage.ref(`patients/${PATIENT_ID_1}/photos/photo1/image.jpg`);
      
      // Create a file larger than 50MB (51MB)
      const largeFile = new Uint8Array(51 * 1024 * 1024);

      await assertStorageFails(photoRef.put(largeFile, { contentType: 'image/jpeg' }));
    });

    it('should allow files under 50MB limit', async () => {
      const authedStorage = authedStorageFor(USER_ID_1);
      
      // Create patient document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'patients', PATIENT_ID_1), {
          userId: USER_ID_1,
          name: 'Test Patient',
          email: 'patient@test.com',
        });
      });

      const photoRef = authedStorage.ref(`patients/${PATIENT_ID_1}/photos/photo1/image.jpg`);
      
      // Create a file under 50MB (1MB)
      const validFile = new Uint8Array(1 * 1024 * 1024);

      await assertSucceeds(photoRef.put(validFile, { contentType: 'image/jpeg' }));
    });

    it('should enforce allowed content types', async () => {
      const authedStorage = authedStorageFor(USER_ID_1);
      
      // Create patient document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'patients', PATIENT_ID_1), {
          userId: USER_ID_1,
          name: 'Test Patient',
          email: 'patient@test.com',
        });
      });

      const photoRef = authedStorage.ref(`patients/${PATIENT_ID_1}/photos/photo1/file.exe`);
      const fileData = new Uint8Array([0x4d, 0x5a]); // EXE header

      await assertStorageFails(photoRef.put(fileData, { contentType: 'application/x-msdownload' }));
    });
  });

  describe('SOAP Note Attachments (PHI)', () => {
    it('should allow owner to upload SOAP note attachment', async () => {
      const authedStorage = authedStorageFor(USER_ID_1);
      
      // Create SOAP note document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'soap_notes', 'soap1'), {
          userId: USER_ID_1,
          patientId: PATIENT_ID_1,
          subjective: 'Patient reports pain',
          objective: 'ROM limited',
          assessment: 'Improving',
          plan: 'Continue treatment',
        });
      });

      const attachmentRef = authedStorage.ref(`soap-notes/soap1/attachments/document.pdf`);
      const pdfData = new Uint8Array(1 * 1024 * 1024);

      await assertSucceeds(attachmentRef.put(pdfData, { contentType: 'application/pdf' }));
    });

    it('should deny non-owner from accessing SOAP note attachments', async () => {
      const authedStorage = authedStorageFor(USER_ID_2);
      
      // Create SOAP note owned by USER_ID_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'soap_notes', 'soap1'), {
          userId: USER_ID_1,
          patientId: PATIENT_ID_1,
          subjective: 'Patient reports pain',
          objective: 'ROM limited',
          assessment: 'Improving',
          plan: 'Continue treatment',
        });
      });

      const attachmentRef = authedStorage.ref(`soap-notes/soap1/attachments/document.pdf`);

      await assertStorageFails(attachmentRef.getDownloadURL());
    });

    it('should enforce 50MB file size limit for SOAP attachments', async () => {
      const authedStorage = authedStorageFor(USER_ID_1);
      
      // Create SOAP note document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'soap_notes', 'soap1'), {
          userId: USER_ID_1,
          patientId: PATIENT_ID_1,
          subjective: 'Patient reports pain',
          objective: 'ROM limited',
          assessment: 'Improving',
          plan: 'Continue treatment',
        });
      });

      const attachmentRef = authedStorage.ref(`soap-notes/soap1/attachments/document.pdf`);
      
      // Create a file larger than 50MB
      const largeFile = new Uint8Array(51 * 1024 * 1024);

      await assertStorageFails(attachmentRef.put(largeFile, { contentType: 'application/pdf' }));
    });
  });

  describe('User Avatars (Non-PHI)', () => {
    it('should allow user to upload their own avatar', async () => {
      const authedStorage = authedStorageFor(USER_ID_1);
      const avatarRef = authedStorage.ref(`users/${USER_ID_1}/avatars/profile.jpg`);
      const imageData = new Uint8Array(1 * 1024 * 1024);

      await assertSucceeds(avatarRef.put(imageData, { contentType: 'image/jpeg' }));
    });

    it('should deny user from uploading another user\'s avatar', async () => {
      const authedStorage = authedStorageFor(USER_ID_2);
      const avatarRef = authedStorage.ref(`users/${USER_ID_1}/avatars/profile.jpg`);
      const imageData = new Uint8Array(1 * 1024 * 1024);

      await assertStorageFails(avatarRef.put(imageData, { contentType: 'image/jpeg' }));
    });

    it('should allow authenticated users to read avatars', async () => {
      const authedStorage = authedStorageFor(USER_ID_2);
      
      // Upload avatar as USER_ID_1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminStorage = context.storage();
        const avatarRef = adminStorage.ref(`users/${USER_ID_1}/avatars/profile.jpg`);
        const imageData = new Uint8Array(1 * 1024 * 1024);
        await avatarRef.put(imageData, { contentType: 'image/jpeg' });
      });

      const avatarRef = authedStorage.ref(`users/${USER_ID_1}/avatars/profile.jpg`);
      await assertSucceeds(avatarRef.getDownloadURL());
    });
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});
