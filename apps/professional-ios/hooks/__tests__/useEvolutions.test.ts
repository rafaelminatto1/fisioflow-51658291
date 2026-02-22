/**
 * Unit tests for useEvolutions hook with E2EE for SOAP notes
 * Tests encryption/decryption of PHI fields
 * 
 * Requirements: 2.5
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useEvolutions } from '../useEvolutions';
import { encryptionService } from '@/lib/services/encryptionService';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
} from 'firebase/firestore';

// Mock Firebase modules
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-user-123',
    },
  },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock('@/lib/services/encryptionService', () => ({
  encryptionService: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
}));

describe('useEvolutions - E2EE for SOAP notes', () => {
  const mockUserId = 'test-user-123';
  const mockPatientId = 'patient-456';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup auth mock
    (auth as any).currentUser = { uid: mockUserId };
  });

  describe('Encryption on create', () => {
    it('should encrypt PHI fields when creating SOAP note', async () => {
      const mockEncryptedData = {
        ciphertext: 'encrypted-data',
        iv: 'random-iv',
        authTag: 'auth-tag',
        algorithm: 'AES-256-GCM' as const,
        keyId: 'key-123',
      };

      (encryptionService.encrypt as jest.Mock).mockResolvedValue(mockEncryptedData);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'soap-123' });

      const { result } = renderHook(() => useEvolutions());

      const soapNote = {
        patientId: mockPatientId,
        sessionNumber: 1,
        subjective: 'Patient reports pain in lower back',
        objective: { inspection: 'Visible swelling' },
        assessment: 'Acute lumbar strain',
        plan: { interventions: ['Manual therapy', 'Exercise'] },
        createdBy: mockUserId,
      };

      await result.current.create(soapNote);

      // Verify encryption was called for each PHI field
      expect(encryptionService.encrypt).toHaveBeenCalledWith(
        'Patient reports pain in lower back',
        mockUserId
      );
      expect(encryptionService.encrypt).toHaveBeenCalledWith(
        JSON.stringify({ inspection: 'Visible swelling' }),
        mockUserId
      );
      expect(encryptionService.encrypt).toHaveBeenCalledWith(
        'Acute lumbar strain',
        mockUserId
      );
      expect(encryptionService.encrypt).toHaveBeenCalledWith(
        JSON.stringify({ interventions: ['Manual therapy', 'Exercise'] }),
        mockUserId
      );

      // Verify addDoc was called with encrypted fields
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          subjective_encrypted: mockEncryptedData,
          objective_encrypted: mockEncryptedData,
          assessment_encrypted: mockEncryptedData,
          plan_encrypted: mockEncryptedData,
        })
      );
    });

    it('should not store plaintext PHI in Firestore', async () => {
      const mockEncryptedData = {
        ciphertext: 'encrypted-data',
        iv: 'random-iv',
        authTag: 'auth-tag',
        algorithm: 'AES-256-GCM' as const,
        keyId: 'key-123',
      };

      (encryptionService.encrypt as jest.Mock).mockResolvedValue(mockEncryptedData);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'soap-123' });

      const { result } = renderHook(() => useEvolutions());

      const soapNote = {
        patientId: mockPatientId,
        sessionNumber: 1,
        subjective: 'Sensitive patient information',
        objective: 'Clinical findings',
        assessment: 'Diagnosis',
        plan: 'Treatment plan',
        createdBy: mockUserId,
      };

      await result.current.create(soapNote);

      // Verify plaintext fields are NOT in the Firestore document
      const firestoreDoc = (addDoc as jest.Mock).mock.calls[0][1];
      expect(firestoreDoc).not.toHaveProperty('subjective');
      expect(firestoreDoc).not.toHaveProperty('objective');
      expect(firestoreDoc).not.toHaveProperty('assessment');
      expect(firestoreDoc).not.toHaveProperty('plan');
    });

    it('should handle partial PHI fields', async () => {
      const mockEncryptedData = {
        ciphertext: 'encrypted-data',
        iv: 'random-iv',
        authTag: 'auth-tag',
        algorithm: 'AES-256-GCM' as const,
        keyId: 'key-123',
      };

      (encryptionService.encrypt as jest.Mock).mockResolvedValue(mockEncryptedData);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'soap-123' });

      const { result } = renderHook(() => useEvolutions());

      // Only subjective and assessment provided
      const soapNote = {
        patientId: mockPatientId,
        sessionNumber: 1,
        subjective: 'Patient complaint',
        assessment: 'Clinical assessment',
        createdBy: mockUserId,
      };

      await result.current.create(soapNote);

      // Verify only provided fields were encrypted
      expect(encryptionService.encrypt).toHaveBeenCalledTimes(2);
      expect(encryptionService.encrypt).toHaveBeenCalledWith('Patient complaint', mockUserId);
      expect(encryptionService.encrypt).toHaveBeenCalledWith('Clinical assessment', mockUserId);
    });
  });

  describe('Encryption on update', () => {
    it('should encrypt PHI fields when updating SOAP note', async () => {
      const mockEncryptedData = {
        ciphertext: 'encrypted-updated-data',
        iv: 'random-iv',
        authTag: 'auth-tag',
        algorithm: 'AES-256-GCM' as const,
        keyId: 'key-123',
      };

      (encryptionService.encrypt as jest.Mock).mockResolvedValue(mockEncryptedData);

      const { result } = renderHook(() => useEvolutions());

      await result.current.update('soap-123', {
        subjective: 'Updated patient complaint',
        assessment: 'Updated assessment',
      });

      // Verify encryption was called for updated fields
      expect(encryptionService.encrypt).toHaveBeenCalledWith(
        'Updated patient complaint',
        mockUserId
      );
      expect(encryptionService.encrypt).toHaveBeenCalledWith(
        'Updated assessment',
        mockUserId
      );
    });

    it('should not encrypt non-PHI fields', async () => {
      const { result } = renderHook(() => useEvolutions());

      await result.current.update('soap-123', {
        sessionNumber: 2,
        signatureHash: 'new-signature',
      });

      // Verify encryption was NOT called for non-PHI fields
      expect(encryptionService.encrypt).not.toHaveBeenCalled();
    });
  });

  describe('Decryption on fetch', () => {
    it('should decrypt PHI fields when fetching SOAP notes', async () => {
      const mockEncryptedData = {
        ciphertext: 'encrypted-data',
        iv: 'random-iv',
        authTag: 'auth-tag',
        algorithm: 'AES-256-GCM' as const,
        keyId: 'key-123',
      };

      const mockFirestoreDoc = {
        id: 'soap-123',
        patient_id: mockPatientId,
        session_number: 1,
        subjective_encrypted: mockEncryptedData,
        objective_encrypted: mockEncryptedData,
        assessment_encrypted: mockEncryptedData,
        plan_encrypted: mockEncryptedData,
        created_by: mockUserId,
        created_at: { toDate: () => new Date() },
        updated_at: { toDate: () => new Date() },
      };

      (encryptionService.decrypt as jest.Mock)
        .mockResolvedValueOnce('Decrypted subjective')
        .mockResolvedValueOnce('{"inspection":"Decrypted objective"}')
        .mockResolvedValueOnce('Decrypted assessment')
        .mockResolvedValueOnce('{"interventions":["Decrypted plan"]}');

      // Mock onSnapshot to call the callback with mock data
      (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
        callback({
          docs: [
            {
              id: 'soap-123',
              data: () => mockFirestoreDoc,
            },
          ],
        });
        return jest.fn(); // unsubscribe function
      });

      const { result } = renderHook(() => useEvolutions(mockPatientId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify decryption was called for each encrypted field
      expect(encryptionService.decrypt).toHaveBeenCalledWith(mockEncryptedData, mockUserId);
      expect(encryptionService.decrypt).toHaveBeenCalledTimes(4);

      // Verify decrypted data is in the result
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].subjective).toBe('Decrypted subjective');
      expect(result.current.data[0].assessment).toBe('Decrypted assessment');
    });

    it('should handle legacy unencrypted data', async () => {
      const mockFirestoreDoc = {
        id: 'soap-legacy',
        patient_id: mockPatientId,
        session_number: 1,
        // Legacy plaintext fields
        subjective: 'Legacy subjective',
        objective: 'Legacy objective',
        assessment: 'Legacy assessment',
        plan: 'Legacy plan',
        created_by: mockUserId,
        created_at: { toDate: () => new Date() },
        updated_at: { toDate: () => new Date() },
      };

      (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
        callback({
          docs: [
            {
              id: 'soap-legacy',
              data: () => mockFirestoreDoc,
            },
          ],
        });
        return jest.fn();
      });

      const { result } = renderHook(() => useEvolutions(mockPatientId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify decryption was NOT called for legacy data
      expect(encryptionService.decrypt).not.toHaveBeenCalled();

      // Verify legacy data is accessible
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].subjective).toBe('Legacy subjective');
      expect(result.current.data[0].objective).toBe('Legacy objective');
      expect(result.current.data[0].assessment).toBe('Legacy assessment');
      expect(result.current.data[0].plan).toBe('Legacy plan');
    });
  });

  describe('Error handling', () => {
    it('should throw error when user is not authenticated', async () => {
      (auth as any).currentUser = null;

      const { result } = renderHook(() => useEvolutions());

      await expect(
        result.current.create({
          patientId: mockPatientId,
          sessionNumber: 1,
          subjective: 'Test',
          createdBy: mockUserId,
        })
      ).rejects.toThrow('User not authenticated');
    });

    it('should handle encryption failures gracefully', async () => {
      (encryptionService.encrypt as jest.Mock).mockRejectedValue(
        new Error('Encryption failed')
      );

      const { result } = renderHook(() => useEvolutions());

      await expect(
        result.current.create({
          patientId: mockPatientId,
          sessionNumber: 1,
          subjective: 'Test',
          createdBy: mockUserId,
        })
      ).rejects.toThrow('Failed to encrypt SOAP note data');
    });

    it('should skip corrupted records during fetch', async () => {
      const mockEncryptedData = {
        ciphertext: 'corrupted-data',
        iv: 'random-iv',
        authTag: 'auth-tag',
        algorithm: 'AES-256-GCM' as const,
        keyId: 'key-123',
      };

      (encryptionService.decrypt as jest.Mock).mockRejectedValue(
        new Error('Decryption failed - authentication tag verification failed')
      );

      (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
        callback({
          docs: [
            {
              id: 'soap-corrupted',
              data: () => ({
                id: 'soap-corrupted',
                patient_id: mockPatientId,
                subjective_encrypted: mockEncryptedData,
                created_at: { toDate: () => new Date() },
                updated_at: { toDate: () => new Date() },
              }),
            },
          ],
        });
        return jest.fn();
      });

      const { result } = renderHook(() => useEvolutions(mockPatientId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify corrupted record was skipped
      expect(result.current.data).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });
  });
});
