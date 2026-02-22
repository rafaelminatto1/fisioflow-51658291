/**
 * Unit Tests for Encryption Service
 * 
 * Tests key generation, storage, encryption/decryption, key rotation, and key clearing
 * Requirements: 2.1, 2.8
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EncryptionService } from '../../lib/services/encryptionService';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

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

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testUserId = 'test-user-123';
  const testData = 'Sensitive patient data';

  beforeEach(() => {
    encryptionService = EncryptionService.getInstance();
    vi.clearAllMocks();

    // Setup default mocks
    (Crypto.getRandomBytesAsync as any).mockResolvedValue(
      new Uint8Array(32).fill(1)
    );
    (Crypto.digestStringAsync as any).mockResolvedValue(
      'mock-hash-' + Math.random()
    );
    (SecureStore.setItemAsync as any).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as any).mockResolvedValue(null);
    (SecureStore.deleteItemAsync as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should generate and store encryption key for new user', async () => {
      // Mock no existing key
      (SecureStore.getItemAsync as any).mockResolvedValue(null);

      await encryptionService.initialize(testUserId);

      // Should have called setItemAsync twice (key + metadata)
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining(testUserId),
        expect.any(String),
        expect.objectContaining({
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should not generate new key if key already exists', async () => {
      // Mock existing key
      (SecureStore.getItemAsync as any).mockResolvedValue('existing-key');

      await encryptionService.initialize(testUserId);

      // Should not have called setItemAsync
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should throw error if key generation fails', async () => {
      (Crypto.getRandomBytesAsync as any).mockRejectedValue(
        new Error('Random generation failed')
      );

      await expect(encryptionService.initialize(testUserId)).rejects.toThrow(
        'Failed to initialize encryption'
      );
    });
  });

  describe('encrypt', () => {
    beforeEach(() => {
      // Mock existing key
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
        return Promise.resolve('mock-encryption-key');
      });

      // Mock crypto operations
      (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );
    });

    it('should encrypt data successfully', async () => {
      const encrypted = await encryptionService.encrypt(testData, testUserId);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('algorithm', 'AES-256-GCM');
      expect(encrypted).toHaveProperty('keyId');
    });

    it('should generate unique IV for each encryption', async () => {
      let ivCallCount = 0;
      (Crypto.getRandomBytesAsync as any).mockImplementation((size: number) => {
        ivCallCount++;
        return Promise.resolve(new Uint8Array(size).fill(ivCallCount));
      });

      const encrypted1 = await encryptionService.encrypt(testData, testUserId);
      const encrypted2 = await encryptionService.encrypt(testData, testUserId);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should throw error if key not found', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue(null);

      await expect(encryptionService.encrypt(testData, testUserId)).rejects.toThrow(
        'Encryption key not found'
      );
    });

    it('should throw error if encryption fails', async () => {
      (mockCrypto.subtle.encrypt as any).mockRejectedValue(
        new Error('Encryption failed')
      );

      await expect(encryptionService.encrypt(testData, testUserId)).rejects.toThrow(
        'Failed to encrypt data'
      );
    });
  });

  describe('decrypt', () => {
    const mockEncryptedData = {
      ciphertext: 'AQIDBA==', // Base64 encoded
      iv: 'AQIDBAUG', // Base64 encoded
      authTag: 'AQIDBAUGBwg=', // Base64 encoded
      algorithm: 'AES-256-GCM' as const,
      keyId: 'key-id',
    };

    beforeEach(() => {
      // Mock existing key
      (SecureStore.getItemAsync as any).mockResolvedValue('mock-encryption-key');

      // Mock crypto operations
      (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
      (mockCrypto.subtle.decrypt as any).mockResolvedValue(
        new TextEncoder().encode(testData).buffer
      );
    });

    it('should decrypt data successfully', async () => {
      const decrypted = await encryptionService.decrypt(mockEncryptedData, testUserId);

      expect(decrypted).toBe(testData);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    it('should throw error if key not found', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue(null);

      await expect(
        encryptionService.decrypt(mockEncryptedData, testUserId)
      ).rejects.toThrow('Encryption key not found');
    });

    it('should throw error if algorithm is unsupported', async () => {
      const invalidData = {
        ...mockEncryptedData,
        algorithm: 'AES-128-CBC' as any,
      };

      await expect(
        encryptionService.decrypt(invalidData, testUserId)
      ).rejects.toThrow('Unsupported encryption algorithm');
    });

    it('should throw error if authentication tag verification fails', async () => {
      (mockCrypto.subtle.decrypt as any).mockRejectedValue(
        new Error('Authentication failed')
      );

      await expect(
        encryptionService.decrypt(mockEncryptedData, testUserId)
      ).rejects.toThrow('Failed to decrypt data');
    });
  });

  describe('encrypt and decrypt round-trip', () => {
    beforeEach(() => {
      // Mock existing key
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
        return Promise.resolve('mock-encryption-key');
      });

      // Mock crypto operations for round-trip
      let encryptedData: ArrayBuffer;
      (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
      (mockCrypto.subtle.encrypt as any).mockImplementation(
        async (algorithm: any, key: any, data: BufferSource) => {
          // Store encrypted data for decryption
          encryptedData = new Uint8Array(data as ArrayBuffer).buffer;
          return encryptedData;
        }
      );
      (mockCrypto.subtle.decrypt as any).mockImplementation(
        async (algorithm: any, key: any, data: BufferSource) => {
          // Return original data
          return encryptedData;
        }
      );
    });

    it('should successfully encrypt and decrypt data', async () => {
      const originalData = 'Test patient data with special chars: áéíóú 123!@#';

      const encrypted = await encryptionService.encrypt(originalData, testUserId);
      
      // Mock decrypt to return original data
      (mockCrypto.subtle.decrypt as any).mockResolvedValue(
        new TextEncoder().encode(originalData).buffer
      );

      const decrypted = await encryptionService.decrypt(encrypted, testUserId);

      expect(decrypted).toBe(originalData);
    });
  });

  describe('rotateKey', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as any).mockResolvedValue('old-key');
    });

    it('should generate new key and store old key', async () => {
      await encryptionService.rotateKey(testUserId);

      // Should store old key with timestamp suffix
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringMatching(/old_\d+/),
        'old-key',
        expect.any(Object)
      );

      // Should store new key
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining(testUserId),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error if key rotation fails', async () => {
      (Crypto.getRandomBytesAsync as any).mockRejectedValue(
        new Error('Random generation failed')
      );

      await expect(encryptionService.rotateKey(testUserId)).rejects.toThrow(
        'Failed to rotate encryption key'
      );
    });
  });

  describe('clearKeys', () => {
    it('should delete all keys for user', async () => {
      await encryptionService.clearKeys(testUserId);

      // Should delete current key
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        expect.stringContaining(testUserId)
      );

      // Should delete metadata
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('_metadata')
      );

      // Should attempt to delete old keys
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(7); // 1 key + 1 metadata + 5 old keys
    });

    it('should not throw error if keys do not exist', async () => {
      (SecureStore.deleteItemAsync as any).mockRejectedValue(
        new Error('Key not found')
      );

      // Should not throw
      await expect(encryptionService.clearKeys(testUserId)).rejects.toThrow(
        'Failed to clear encryption keys'
      );
    });
  });

  describe('key expiration', () => {
    it('should warn if key is expired', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock expired key
      (SecureStore.getItemAsync as any).mockImplementation((key: string) => {
        if (key.includes('_metadata')) {
          return Promise.resolve(
            JSON.stringify({
              id: 'key-id',
              userId: testUserId,
              algorithm: 'AES-256-GCM',
              keyHash: 'mock-hash',
              createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
              expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // Expired 10 days ago
            })
          );
        }
        return Promise.resolve('expired-key');
      });

      // Mock crypto operations
      (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );

      await encryptionService.encrypt(testData, testUserId);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Key expired')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('data types', () => {
    beforeEach(() => {
      // Mock existing key
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
        return Promise.resolve('mock-encryption-key');
      });

      // Mock crypto operations
      (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
    });

    it('should encrypt empty string', async () => {
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );

      const encrypted = await encryptionService.encrypt('', testUserId);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
    });

    it('should encrypt string with special characters', async () => {
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );

      const specialData = 'Test with special chars: áéíóú ñ 中文 🔒';
      const encrypted = await encryptionService.encrypt(specialData, testUserId);

      expect(encrypted).toHaveProperty('ciphertext');
    });

    it('should encrypt large text', async () => {
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );

      const largeData = 'A'.repeat(10000); // 10KB of data
      const encrypted = await encryptionService.encrypt(largeData, testUserId);

      expect(encrypted).toHaveProperty('ciphertext');
    });
  });

  describe('encryptFile', () => {
    const testFileUri = 'file:///test/image.jpg';
    const testFileContent = 'base64-encoded-file-content';

    beforeEach(() => {
      // Mock existing key
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
        return Promise.resolve('mock-encryption-key');
      });

      // Mock file system operations
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: true,
        size: 1024 * 1024, // 1MB
        isDirectory: false,
      });

      (FileSystem.readAsStringAsync as any).mockResolvedValue(testFileContent);

      // Mock crypto operations
      (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );
    });

    it('should encrypt file successfully', async () => {
      const encrypted = await encryptionService.encryptFile(testFileUri, testUserId);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('algorithm', 'AES-256-GCM');
      expect(FileSystem.getInfoAsync).toHaveBeenCalledWith(testFileUri);
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
        testFileUri,
        { encoding: FileSystem.EncodingType.Base64 }
      );
    });

    it('should throw error if file does not exist', async () => {
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: false,
      });

      await expect(
        encryptionService.encryptFile(testFileUri, testUserId)
      ).rejects.toThrow('File not found');
    });

    it('should throw error if file exceeds 50MB limit', async () => {
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: true,
        size: 51 * 1024 * 1024, // 51MB
        isDirectory: false,
      });

      await expect(
        encryptionService.encryptFile(testFileUri, testUserId)
      ).rejects.toThrow('File size exceeds 50MB limit');
    });

    it('should handle large files up to 50MB', async () => {
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: true,
        size: 50 * 1024 * 1024, // Exactly 50MB
        isDirectory: false,
      });

      const encrypted = await encryptionService.encryptFile(testFileUri, testUserId);

      expect(encrypted).toHaveProperty('ciphertext');
    });

    it('should throw error if key not found', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue(null);

      await expect(
        encryptionService.encryptFile(testFileUri, testUserId)
      ).rejects.toThrow('Encryption key not found');
    });

    it('should throw error if file read fails', async () => {
      (FileSystem.readAsStringAsync as any).mockRejectedValue(
        new Error('File read failed')
      );

      await expect(
        encryptionService.encryptFile(testFileUri, testUserId)
      ).rejects.toThrow('Failed to encrypt file');
    });
  });

  describe('decryptFile', () => {
    const mockEncryptedData = {
      ciphertext: 'AQIDBA==',
      iv: 'AQIDBAUG',
      authTag: 'AQIDBAUGBwg=',
      algorithm: 'AES-256-GCM' as const,
      keyId: 'key-id',
    };
    const decryptedContent = 'base64-decoded-file-content';

    beforeEach(() => {
      // Mock existing key
      (SecureStore.getItemAsync as any).mockResolvedValue('mock-encryption-key');

      // Mock crypto operations
      (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
      (mockCrypto.subtle.decrypt as any).mockResolvedValue(
        new TextEncoder().encode(decryptedContent).buffer
      );

      // Mock file system operations
      (FileSystem.writeAsStringAsync as any).mockResolvedValue(undefined);
    });

    it('should decrypt file successfully', async () => {
      const tempFileUri = await encryptionService.decryptFile(
        mockEncryptedData,
        testUserId
      );

      expect(tempFileUri).toMatch(/^file:\/\/\/cache\/decrypted_/);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringMatching(/^file:\/\/\/cache\/decrypted_/),
        decryptedContent,
        { encoding: FileSystem.EncodingType.Base64 }
      );
    });

    it('should create unique temporary file names', async () => {
      const tempFileUri1 = await encryptionService.decryptFile(
        mockEncryptedData,
        testUserId
      );
      const tempFileUri2 = await encryptionService.decryptFile(
        mockEncryptedData,
        testUserId
      );

      expect(tempFileUri1).not.toBe(tempFileUri2);
    });

    it('should throw error if key not found', async () => {
      (SecureStore.getItemAsync as any).mockResolvedValue(null);

      await expect(
        encryptionService.decryptFile(mockEncryptedData, testUserId)
      ).rejects.toThrow('Encryption key not found');
    });

    it('should throw error if decryption fails', async () => {
      (mockCrypto.subtle.decrypt as any).mockRejectedValue(
        new Error('Decryption failed')
      );

      await expect(
        encryptionService.decryptFile(mockEncryptedData, testUserId)
      ).rejects.toThrow('Failed to decrypt file');
    });

    it('should throw error if file write fails', async () => {
      (FileSystem.writeAsStringAsync as any).mockRejectedValue(
        new Error('File write failed')
      );

      await expect(
        encryptionService.decryptFile(mockEncryptedData, testUserId)
      ).rejects.toThrow('Failed to decrypt file');
    });
  });

  describe('file encryption round-trip', () => {
    const testFileUri = 'file:///test/image.jpg';
    const testFileContent = 'base64-encoded-image-data';

    beforeEach(() => {
      // Mock existing key
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
        return Promise.resolve('mock-encryption-key');
      });

      // Mock file system operations
      (FileSystem.getInfoAsync as any).mockResolvedValue({
        exists: true,
        size: 1024 * 1024,
        isDirectory: false,
      });

      (FileSystem.readAsStringAsync as any).mockResolvedValue(testFileContent);
      (FileSystem.writeAsStringAsync as any).mockResolvedValue(undefined);

      // Mock crypto operations for round-trip
      (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
      (mockCrypto.subtle.encrypt as any).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]).buffer
      );
      (mockCrypto.subtle.decrypt as any).mockResolvedValue(
        new TextEncoder().encode(testFileContent).buffer
      );
    });

    it('should successfully encrypt and decrypt file', async () => {
      // Encrypt file
      const encrypted = await encryptionService.encryptFile(testFileUri, testUserId);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');

      // Decrypt file
      const decryptedUri = await encryptionService.decryptFile(encrypted, testUserId);

      expect(decryptedUri).toMatch(/^file:\/\/\/cache\/decrypted_/);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        decryptedUri,
        testFileContent,
        { encoding: FileSystem.EncodingType.Base64 }
      );
    });
  });
});
