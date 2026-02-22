/**
 * Integration Tests for Encrypted Data Flow
 * 
 * Tests end-to-end encrypted data flow for:
 * 1. Patient photos: create → upload encrypted → retrieve → decrypt → display
 * 2. SOAP notes: create → encrypt → store → retrieve → decrypt → display
 * 
 * Requirements: 2.4, 2.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EncryptionService } from '../../lib/services/encryptionService';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Mock expo-crypto
vi.mock('expo-crypto', () => ({
  getRandomBytesAsync: vi.fn(),
  digestStringAsync: vi.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

// Mock expo-file-system
vi.mock('expo-file-system', () => ({
  getInfoAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  cacheDirectory: 'file:///cache/',
  EncodingType: {
    Base64: 'base64',
  },
}));

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadString: vi.fn(),
  getDownloadURL: vi.fn(),
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

// Mock Firebase lib
vi.mock('../../lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-user-123',
    },
  },
}));

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
};

// @ts-ignore
global.crypto = mockCrypto;

describe('Encrypted Data Flow Integration Tests', () => {
  let encryptionService: EncryptionService;
  const testUserId = 'test-user-123';
  const testPatientId = 'patient-456';

  beforeEach(() => {
    encryptionService = EncryptionService.getInstance();
    vi.clearAllMocks();

    // Setup encryption mocks
    (Crypto.getRandomBytesAsync as any).mockResolvedValue(
      new Uint8Array(32).fill(1)
    );
    (Crypto.digestStringAsync as any).mockResolvedValue(
      'mock-hash-' + Math.random()
    );
    (SecureStore.setItemAsync as any).mockResolvedValue(undefined);

    // Mock existing encryption key
    (SecureStore.getItemAsync as any).mockImplementation((key: string) => {
      if (key.includes('_metadata')) {
        return Promise.resolve(
          JSON.stringify({
            id: 'key-id',
            userId: testUserId,
            algorithm: 'AES-256-GCM',
            keyHash: 'mock-hash',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          })
        );
      }
      return Promise.resolve('mock-encryption-key-base64');
    });

    // Mock crypto operations
    (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Patient Photo Encrypted Flow', () => {
    const testPhotoUri = 'file:///test/patient-photo.jpg';
    const testPhotoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const mockEncryptedPhotoData = {
      ciphertext: 'encrypted-photo-ciphertext-base64',
      iv: 'random-iv-base64',
      authTag: 'auth-tag-base64',
      algorithm: 'AES-256-GCM' as const,
      keyId: 'key-id-123',
    };

    beforeEach(() => {
      // Mock file system for photo
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: true,
        size: 1024 * 500, // 500KB
        isDirectory: false,
      });
      (FileSystem.readAsStringAsync as any).mockResolvedValue(testPhotoBase64);
      (FileSystem.writeAsStringAsync as any).mockResolvedValue(undefined);

      // Mock encryption
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );
    });

    it('should complete full encrypted photo flow: create → upload → retrieve → decrypt → display', async () => {
      // Step 1: Create patient photo (read from file system)
      const photoUri = testPhotoUri;
      expect(photoUri).toBeDefined();

      // Step 2: Encrypt photo before upload
      const encryptedPhoto = await encryptionService.encryptFile(photoUri, testUserId);
      
      expect(encryptedPhoto).toHaveProperty('ciphertext');
      expect(encryptedPhoto).toHaveProperty('iv');
      expect(encryptedPhoto).toHaveProperty('authTag');
      expect(encryptedPhoto.algorithm).toBe('AES-256-GCM');
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
        photoUri,
        { encoding: FileSystem.EncodingType.Base64 }
      );

      // Step 3: Upload encrypted photo to Firebase Storage
      const mockStorageRef = { fullPath: 'patients/patient-456/photos/photo-123.jpg' };
      (ref as any).mockReturnValue(mockStorageRef);
      (uploadString as any).mockResolvedValue({ ref: mockStorageRef });
      
      const encryptedPhotoJson = JSON.stringify(encryptedPhoto);
      await uploadString(mockStorageRef, encryptedPhotoJson, 'raw');
      
      expect(uploadString).toHaveBeenCalledWith(
        mockStorageRef,
        encryptedPhotoJson,
        'raw'
      );

      // Step 4: Retrieve encrypted photo from Firebase Storage
      const mockDownloadUrl = 'https://storage.googleapis.com/test-bucket/encrypted-photo';
      (getDownloadURL as any).mockResolvedValue(mockDownloadUrl);
      
      const downloadUrl = await getDownloadURL(mockStorageRef);
      expect(downloadUrl).toBe(mockDownloadUrl);

      // Step 5: Fetch encrypted data
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(encryptedPhotoJson),
      });

      const response = await fetch(downloadUrl);
      const encryptedText = await response.text();
      const retrievedEncryptedData = JSON.parse(encryptedText);
      
      expect(retrievedEncryptedData).toEqual(encryptedPhoto);

      // Step 6: Decrypt photo
      (mockCrypto.subtle.decrypt as any).mockResolvedValue(
        new TextEncoder().encode(testPhotoBase64).buffer
      );

      const decryptedPhotoUri = await encryptionService.decryptFile(
        retrievedEncryptedData,
        testUserId
      );

      expect(decryptedPhotoUri).toMatch(/^file:\/\/\/cache\/decrypted_/);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        decryptedPhotoUri,
        testPhotoBase64,
        { encoding: FileSystem.EncodingType.Base64 }
      );

      // Step 7: Display photo (verify decrypted URI is accessible)
      expect(decryptedPhotoUri).toBeTruthy();
      expect(typeof decryptedPhotoUri).toBe('string');
      
      // Verify encryption metadata was stored
      expect(retrievedEncryptedData.iv).toBeTruthy();
      expect(retrievedEncryptedData.authTag).toBeTruthy();
      expect(retrievedEncryptedData.keyId).toBeTruthy();
    });

    it('should verify encryption metadata (IV, authTag) is stored with photo', async () => {
      // Encrypt photo
      const encryptedPhoto = await encryptionService.encryptFile(testPhotoUri, testUserId);

      // Verify all encryption metadata is present
      expect(encryptedPhoto.iv).toBeDefined();
      expect(encryptedPhoto.iv).not.toBe('');
      expect(encryptedPhoto.authTag).toBeDefined();
      expect(encryptedPhoto.authTag).not.toBe('');
      expect(encryptedPhoto.keyId).toBeDefined();
      expect(encryptedPhoto.algorithm).toBe('AES-256-GCM');

      // Verify IV is unique (base64 encoded random bytes)
      expect(encryptedPhoto.iv.length).toBeGreaterThan(0);
      expect(encryptedPhoto.authTag.length).toBeGreaterThan(0);
    });

    it('should verify decryption produces original photo data', async () => {
      // Encrypt photo
      const encryptedPhoto = await encryptionService.encryptFile(testPhotoUri, testUserId);

      // Mock decryption to return original data
      (mockCrypto.subtle.decrypt as any).mockResolvedValue(
        new TextEncoder().encode(testPhotoBase64).buffer
      );

      // Decrypt photo
      const decryptedPhotoUri = await encryptionService.decryptFile(
        encryptedPhoto,
        testUserId
      );

      // Verify decrypted content matches original
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        decryptedPhotoUri,
        testPhotoBase64,
        { encoding: FileSystem.EncodingType.Base64 }
      );
    });

    it('should handle large photos up to 50MB', async () => {
      // Mock large file (50MB)
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: true,
        size: 50 * 1024 * 1024, // Exactly 50MB
        isDirectory: false,
      });

      const largePhotoBase64 = 'A'.repeat(1000000); // Large base64 string
      (FileSystem.readAsStringAsync as any).mockResolvedValue(largePhotoBase64);

      // Should successfully encrypt large file
      const encryptedPhoto = await encryptionService.encryptFile(testPhotoUri, testUserId);

      expect(encryptedPhoto).toHaveProperty('ciphertext');
      expect(encryptedPhoto).toHaveProperty('iv');
      expect(encryptedPhoto).toHaveProperty('authTag');
    });

    it('should reject photos exceeding 50MB limit', async () => {
      // Mock file exceeding limit
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: true,
        size: 51 * 1024 * 1024, // 51MB
        isDirectory: false,
      });

      await expect(
        encryptionService.encryptFile(testPhotoUri, testUserId)
      ).rejects.toThrow('Failed to encrypt file');
    });
  });

  describe('SOAP Note Encrypted Flow', () => {
    const testSOAPNote = {
      patientId: testPatientId,
      appointmentId: 'appointment-789',
      sessionNumber: 1,
      subjective: 'Patient reports pain in lower back, 7/10 intensity. Pain worsens with prolonged sitting.',
      objective: {
        vitalSigns: { bloodPressure: '120/80', heartRate: 72 },
        examination: 'Limited lumbar flexion, tenderness at L4-L5',
      },
      assessment: 'Acute lower back pain, likely muscular strain. No red flags observed.',
      plan: {
        treatment: 'Manual therapy, core strengthening exercises',
        frequency: '2x per week for 4 weeks',
        goals: 'Reduce pain to 3/10, improve lumbar ROM',
      },
      createdBy: testUserId,
    };

    beforeEach(() => {
      // Mock encryption for text data
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );
    });

    it('should complete full encrypted SOAP note flow: create → encrypt → store → retrieve → decrypt → display', async () => {
      // Step 1: Create SOAP note
      const soapNote = testSOAPNote;
      expect(soapNote.subjective).toBeDefined();
      expect(soapNote.objective).toBeDefined();
      expect(soapNote.assessment).toBeDefined();
      expect(soapNote.plan).toBeDefined();

      // Step 2: Encrypt SOAP note fields
      const encryptedSubjective = await encryptionService.encrypt(
        soapNote.subjective,
        testUserId
      );
      const encryptedObjective = await encryptionService.encrypt(
        JSON.stringify(soapNote.objective),
        testUserId
      );
      const encryptedAssessment = await encryptionService.encrypt(
        soapNote.assessment,
        testUserId
      );
      const encryptedPlan = await encryptionService.encrypt(
        JSON.stringify(soapNote.plan),
        testUserId
      );

      expect(encryptedSubjective).toHaveProperty('ciphertext');
      expect(encryptedSubjective).toHaveProperty('iv');
      expect(encryptedSubjective).toHaveProperty('authTag');
      expect(encryptedObjective).toHaveProperty('ciphertext');
      expect(encryptedAssessment).toHaveProperty('ciphertext');
      expect(encryptedPlan).toHaveProperty('ciphertext');

      // Step 3: Store encrypted SOAP note in Firestore
      const mockDocRef = { id: 'soap-note-123' };
      (addDoc as any).mockResolvedValue(mockDocRef);
      (collection as any).mockReturnValue('evolutions-collection');

      const firestoreData = {
        patient_id: soapNote.patientId,
        appointment_id: soapNote.appointmentId,
        session_number: soapNote.sessionNumber,
        subjective_encrypted: encryptedSubjective,
        objective_encrypted: encryptedObjective,
        assessment_encrypted: encryptedAssessment,
        plan_encrypted: encryptedPlan,
        created_by: soapNote.createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const docRef = await addDoc(collection(db, 'evolutions'), firestoreData);
      expect(docRef.id).toBe('soap-note-123');
      expect(addDoc).toHaveBeenCalledWith(
        'evolutions-collection',
        expect.objectContaining({
          subjective_encrypted: encryptedSubjective,
          objective_encrypted: encryptedObjective,
          assessment_encrypted: encryptedAssessment,
          plan_encrypted: encryptedPlan,
        })
      );

      // Step 4: Retrieve encrypted SOAP note from Firestore
      (doc as any).mockReturnValue('soap-note-doc-ref');
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: 'soap-note-123',
        data: () => firestoreData,
      });

      const docSnap = await getDoc(doc(db, 'evolutions', 'soap-note-123'));
      expect(docSnap.exists()).toBe(true);
      
      const retrievedData = docSnap.data();
      expect(retrievedData.subjective_encrypted).toEqual(encryptedSubjective);
      expect(retrievedData.objective_encrypted).toEqual(encryptedObjective);
      expect(retrievedData.assessment_encrypted).toEqual(encryptedAssessment);
      expect(retrievedData.plan_encrypted).toEqual(encryptedPlan);

      // Step 5: Decrypt SOAP note fields
      (mockCrypto.subtle.decrypt as any).mockImplementation(
        async (algorithm: any, key: any, data: BufferSource) => {
          // Return different decrypted data based on call order
          const callCount = (mockCrypto.subtle.decrypt as any).mock.calls.length;
          if (callCount === 1) {
            return new TextEncoder().encode(soapNote.subjective).buffer;
          } else if (callCount === 2) {
            return new TextEncoder().encode(JSON.stringify(soapNote.objective)).buffer;
          } else if (callCount === 3) {
            return new TextEncoder().encode(soapNote.assessment).buffer;
          } else {
            return new TextEncoder().encode(JSON.stringify(soapNote.plan)).buffer;
          }
        }
      );

      const decryptedSubjective = await encryptionService.decrypt(
        retrievedData.subjective_encrypted,
        testUserId
      );
      const decryptedObjectiveStr = await encryptionService.decrypt(
        retrievedData.objective_encrypted,
        testUserId
      );
      const decryptedAssessment = await encryptionService.decrypt(
        retrievedData.assessment_encrypted,
        testUserId
      );
      const decryptedPlanStr = await encryptionService.decrypt(
        retrievedData.plan_encrypted,
        testUserId
      );

      const decryptedObjective = JSON.parse(decryptedObjectiveStr);
      const decryptedPlan = JSON.parse(decryptedPlanStr);

      // Step 6: Display SOAP note (verify decrypted data matches original)
      expect(decryptedSubjective).toBe(soapNote.subjective);
      expect(decryptedObjective).toEqual(soapNote.objective);
      expect(decryptedAssessment).toBe(soapNote.assessment);
      expect(decryptedPlan).toEqual(soapNote.plan);

      // Verify encryption metadata was stored
      expect(retrievedData.subjective_encrypted.iv).toBeTruthy();
      expect(retrievedData.subjective_encrypted.authTag).toBeTruthy();
      expect(retrievedData.objective_encrypted.iv).toBeTruthy();
      expect(retrievedData.assessment_encrypted.iv).toBeTruthy();
      expect(retrievedData.plan_encrypted.iv).toBeTruthy();
    });

    it('should verify each SOAP field has unique encryption metadata', async () => {
      // Mock unique IVs for each encryption call
      let callCount = 0;
      (Crypto.getRandomBytesAsync as any).mockImplementation((size: number) => {
        callCount++;
        const iv = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
          iv[i] = callCount; // Different value for each call
        }
        return Promise.resolve(iv);
      });

      // Encrypt all SOAP fields
      const encryptedSubjective = await encryptionService.encrypt(
        testSOAPNote.subjective,
        testUserId
      );
      const encryptedObjective = await encryptionService.encrypt(
        JSON.stringify(testSOAPNote.objective),
        testUserId
      );
      const encryptedAssessment = await encryptionService.encrypt(
        testSOAPNote.assessment,
        testUserId
      );
      const encryptedPlan = await encryptionService.encrypt(
        JSON.stringify(testSOAPNote.plan),
        testUserId
      );

      // Verify each field has its own IV (should be unique)
      expect(encryptedSubjective.iv).toBeDefined();
      expect(encryptedObjective.iv).toBeDefined();
      expect(encryptedAssessment.iv).toBeDefined();
      expect(encryptedPlan.iv).toBeDefined();

      // IVs should be different for each field
      const ivs = [
        encryptedSubjective.iv,
        encryptedObjective.iv,
        encryptedAssessment.iv,
        encryptedPlan.iv,
      ];
      const uniqueIvs = new Set(ivs);
      expect(uniqueIvs.size).toBe(4); // All IVs should be unique

      // Verify auth tags are present
      expect(encryptedSubjective.authTag).toBeDefined();
      expect(encryptedObjective.authTag).toBeDefined();
      expect(encryptedAssessment.authTag).toBeDefined();
      expect(encryptedPlan.authTag).toBeDefined();
    });

    it('should handle SOAP notes with special characters and Unicode', async () => {
      const specialSOAPNote = {
        subjective: 'Paciente relata dor aguda (8/10) na região lombar. Sintomas: "queimação" e formigamento.',
        objective: { examination: 'Teste de Lasègue positivo à 45°' },
        assessment: 'Possível hérnia de disco L4-L5. Necessário investigação adicional.',
        plan: { treatment: 'Fisioterapia 3x/semana + medicação anti-inflamatória' },
      };

      // Encrypt fields with special characters
      const encryptedSubjective = await encryptionService.encrypt(
        specialSOAPNote.subjective,
        testUserId
      );
      const encryptedObjective = await encryptionService.encrypt(
        JSON.stringify(specialSOAPNote.objective),
        testUserId
      );

      expect(encryptedSubjective).toHaveProperty('ciphertext');
      expect(encryptedObjective).toHaveProperty('ciphertext');

      // Mock decryption to return original data
      (mockCrypto.subtle.decrypt as any).mockImplementation(
        async (algorithm: any, key: any, data: BufferSource) => {
          const callCount = (mockCrypto.subtle.decrypt as any).mock.calls.length;
          if (callCount === 1) {
            return new TextEncoder().encode(specialSOAPNote.subjective).buffer;
          } else {
            return new TextEncoder().encode(JSON.stringify(specialSOAPNote.objective)).buffer;
          }
        }
      );

      // Decrypt and verify
      const decryptedSubjective = await encryptionService.decrypt(
        encryptedSubjective,
        testUserId
      );
      const decryptedObjectiveStr = await encryptionService.decrypt(
        encryptedObjective,
        testUserId
      );

      expect(decryptedSubjective).toBe(specialSOAPNote.subjective);
      expect(JSON.parse(decryptedObjectiveStr)).toEqual(specialSOAPNote.objective);
    });

    it('should handle empty SOAP fields gracefully', async () => {
      const emptySOAPNote = {
        subjective: '',
        objective: {},
        assessment: '',
        plan: {},
      };

      // Encrypt empty fields
      const encryptedSubjective = await encryptionService.encrypt(
        emptySOAPNote.subjective,
        testUserId
      );
      const encryptedObjective = await encryptionService.encrypt(
        JSON.stringify(emptySOAPNote.objective),
        testUserId
      );

      expect(encryptedSubjective).toHaveProperty('ciphertext');
      expect(encryptedObjective).toHaveProperty('ciphertext');

      // Even empty data should have encryption metadata
      expect(encryptedSubjective.iv).toBeDefined();
      expect(encryptedSubjective.authTag).toBeDefined();
    });

    it('should handle large SOAP notes with extensive clinical data', async () => {
      const largeSOAPNote = {
        subjective: 'A'.repeat(5000), // 5KB of text
        objective: {
          vitalSigns: { bloodPressure: '120/80', heartRate: 72, temperature: 36.5 },
          examination: 'B'.repeat(3000),
          measurements: { rom: 'C'.repeat(2000) },
        },
        assessment: 'D'.repeat(4000),
        plan: {
          treatment: 'E'.repeat(3000),
          exercises: 'F'.repeat(2000),
          goals: 'G'.repeat(1000),
        },
      };

      // Encrypt large SOAP note
      const encryptedSubjective = await encryptionService.encrypt(
        largeSOAPNote.subjective,
        testUserId
      );
      const encryptedObjective = await encryptionService.encrypt(
        JSON.stringify(largeSOAPNote.objective),
        testUserId
      );

      expect(encryptedSubjective).toHaveProperty('ciphertext');
      expect(encryptedObjective).toHaveProperty('ciphertext');

      // Verify encryption metadata is present even for large data
      expect(encryptedSubjective.iv).toBeDefined();
      expect(encryptedSubjective.authTag).toBeDefined();
      expect(encryptedObjective.iv).toBeDefined();
      expect(encryptedObjective.authTag).toBeDefined();
    });

    it('should never log decrypted PHI content', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');

      // Encrypt SOAP note
      const encryptedSubjective = await encryptionService.encrypt(
        testSOAPNote.subjective,
        testUserId
      );

      // Mock decryption
      (mockCrypto.subtle.decrypt as any).mockResolvedValue(
        new TextEncoder().encode(testSOAPNote.subjective).buffer
      );

      // Decrypt SOAP note
      await encryptionService.decrypt(encryptedSubjective, testUserId);

      // Verify PHI content is not logged
      const allLogs = [
        ...consoleLogSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
      ].join(' ');

      expect(allLogs).not.toContain(testSOAPNote.subjective);
      expect(allLogs).not.toContain('pain in lower back');

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cross-Flow Integration', () => {
    const testSOAPData = {
      subjective: 'Test SOAP subjective data',
      objective: { examination: 'Test examination' },
      assessment: 'Test assessment',
      plan: { treatment: 'Test treatment' },
    };

    it('should handle concurrent encryption of photo and SOAP note', async () => {
      const photoUri = 'file:///test/patient-photo.jpg';
      const photoBase64 = 'test-photo-base64-data';
      
      // Mock file system
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: true,
        size: 1024 * 100,
        isDirectory: false,
      });
      (FileSystem.readAsStringAsync as any).mockResolvedValue(photoBase64);

      // Mock unique IVs for concurrent operations
      let callCount = 0;
      (Crypto.getRandomBytesAsync as any).mockImplementation((size: number) => {
        callCount++;
        const iv = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
          iv[i] = callCount + i; // Make each IV unique
        }
        return Promise.resolve(iv);
      });

      // Encrypt photo and SOAP note concurrently
      const [encryptedPhoto, encryptedSubjective] = await Promise.all([
        encryptionService.encryptFile(photoUri, testUserId),
        encryptionService.encrypt(testSOAPData.subjective, testUserId),
      ]);

      // Both should succeed
      expect(encryptedPhoto).toHaveProperty('ciphertext');
      expect(encryptedSubjective).toHaveProperty('ciphertext');

      // IVs should be unique
      expect(encryptedPhoto.iv).not.toBe(encryptedSubjective.iv);
    });

    it('should maintain data integrity across multiple encrypt/decrypt cycles', async () => {
      const originalData = 'Sensitive patient information: Test data 123';

      // Mock unique IVs for each encryption
      let ivCounter = 0;
      (Crypto.getRandomBytesAsync as any).mockImplementation((size: number) => {
        ivCounter++;
        const iv = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
          iv[i] = ivCounter;
        }
        return Promise.resolve(iv);
      });

      // Encrypt
      const encrypted1 = await encryptionService.encrypt(originalData, testUserId);

      // Mock decryption to return original
      (mockCrypto.subtle.decrypt as any).mockResolvedValue(
        new TextEncoder().encode(originalData).buffer
      );

      // Decrypt
      const decrypted1 = await encryptionService.decrypt(encrypted1, testUserId);
      expect(decrypted1).toBe(originalData);

      // Re-encrypt the decrypted data
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );
      const encrypted2 = await encryptionService.encrypt(decrypted1, testUserId);

      // IVs should be different (new encryption operation)
      expect(encrypted2.iv).not.toBe(encrypted1.iv);

      // Mock second decryption
      (mockCrypto.subtle.decrypt as any).mockResolvedValue(
        new TextEncoder().encode(originalData).buffer
      );

      // Decrypt again
      const decrypted2 = await encryptionService.decrypt(encrypted2, testUserId);
      expect(decrypted2).toBe(originalData);
    });

    it('should fail gracefully if encryption key is missing during retrieval', async () => {
      // Mock missing key
      (SecureStore.getItemAsync as any).mockResolvedValue(null);

      const mockEncryptedData = {
        ciphertext: 'test-ciphertext',
        iv: 'test-iv',
        authTag: 'test-auth-tag',
        algorithm: 'AES-256-GCM' as const,
        keyId: 'key-id',
      };

      // Should throw error when trying to decrypt without key
      await expect(
        encryptionService.decrypt(mockEncryptedData, testUserId)
      ).rejects.toThrow('Failed to decrypt data');
    });

    it('should fail if authentication tag verification fails (tampered data)', async () => {
      // Encrypt data
      const originalData = 'Original patient data';
      const encrypted = await encryptionService.encrypt(originalData, testUserId);

      // Tamper with ciphertext
      const tamperedData = {
        ...encrypted,
        ciphertext: 'tampered-ciphertext-base64',
      };

      // Mock decryption failure (auth tag mismatch)
      (mockCrypto.subtle.decrypt as any).mockRejectedValue(
        new Error('Authentication failed')
      );

      // Should throw error
      await expect(
        encryptionService.decrypt(tamperedData, testUserId)
      ).rejects.toThrow('Failed to decrypt data');
    });

    it('should verify encryption algorithm is always AES-256-GCM', async () => {
      // Encrypt various types of data
      const encryptedText = await encryptionService.encrypt('test text', testUserId);
      
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: true,
        size: 1024,
        isDirectory: false,
      });
      (FileSystem.readAsStringAsync as any).mockResolvedValue('test-file-data');
      
      const encryptedFile = await encryptionService.encryptFile(
        'file:///test.jpg',
        testUserId
      );

      // All should use AES-256-GCM
      expect(encryptedText.algorithm).toBe('AES-256-GCM');
      expect(encryptedFile.algorithm).toBe('AES-256-GCM');
    });
  });
});
