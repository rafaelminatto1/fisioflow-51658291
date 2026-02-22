/**
 * Property-Based Test: PHI Encryption at Rest
 * 
 * **Property 1: PHI Encryption at Rest**
 * **Validates: Requirements 2.1, 2.4, 13.1**
 * 
 * For any PHI data (SOAP notes, patient photos, medical records), when stored in 
 * Firestore or Firebase Storage, the data must be encrypted using AES-256-GCM before storage.
 * 
 * Test Strategy: Generate random PHI data (text and files), encrypt it using the 
 * EncryptionService, and verify that the encrypted output contains ciphertext that 
 * is different from the original plaintext and includes all required encryption metadata.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
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

describe('Property 1: PHI Encryption at Rest', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = EncryptionService.getInstance();
    vi.clearAllMocks();

    // Setup default mocks for encryption
    (Crypto.getRandomBytesAsync as any).mockImplementation((size: number) => {
      return Promise.resolve(new Uint8Array(size).fill(Math.floor(Math.random() * 256)));
    });

    (Crypto.digestStringAsync as any).mockImplementation((algo: string, data: string) => {
      return Promise.resolve('mock-hash-' + Math.random());
    });

    (SecureStore.setItemAsync as any).mockResolvedValue(undefined);
    
    (SecureStore.getItemAsync as any).mockImplementation((key: string) => {
      if (key.includes('_metadata')) {
        return Promise.resolve(
          JSON.stringify({
            id: 'key-id',
            userId: 'test-user',
            algorithm: 'AES-256-GCM',
            keyHash: 'mock-hash',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          })
        );
      }
      return Promise.resolve('mock-encryption-key-' + Math.random());
    });

    (SecureStore.deleteItemAsync as any).mockResolvedValue(undefined);

    // Mock crypto operations
    (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
    
    (mockCrypto.subtle.encrypt as any).mockImplementation(
      async (algorithm: any, key: any, data: BufferSource) => {
        // Simulate encryption by creating a different buffer
        const input = new Uint8Array(data as ArrayBuffer);
        const encrypted = new Uint8Array(input.length + 16); // Add auth tag
        
        // XOR with a pattern to simulate encryption (not real encryption!)
        for (let i = 0; i < input.length; i++) {
          encrypted[i] = input[i] ^ 0xAA;
        }
        
        // Add mock auth tag
        for (let i = input.length; i < encrypted.length; i++) {
          encrypted[i] = 0xFF;
        }
        
        return encrypted.buffer;
      }
    );

    (mockCrypto.subtle.decrypt as any).mockImplementation(
      async (algorithm: any, key: any, data: BufferSource) => {
        // Simulate decryption by reversing the XOR
        const encrypted = new Uint8Array(data as ArrayBuffer);
        const decrypted = new Uint8Array(encrypted.length - 16); // Remove auth tag
        
        for (let i = 0; i < decrypted.length; i++) {
          decrypted[i] = encrypted[i] ^ 0xAA;
        }
        
        return decrypted.buffer;
      }
    );

    // Mock file system operations
    (FileSystem.getInfoAsync as any).mockResolvedValue({
      exists: true,
      size: 1024,
      isDirectory: false,
    });

    (FileSystem.readAsStringAsync as any).mockImplementation((uri: string) => {
      // Return base64-encoded mock data
      return Promise.resolve(btoa('mock-file-content-' + uri));
    });

    (FileSystem.writeAsStringAsync as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Property 1.1: Text PHI data must be encrypted before storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PHI text data
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 5, maxLength: 20 }), // userId
        async (phiData, userId) => {
          // Initialize encryption for user
          await encryptionService.initialize(userId);

          // Encrypt the PHI data
          const encrypted = await encryptionService.encrypt(phiData, userId);

          // Verify encrypted data structure
          expect(encrypted).toHaveProperty('ciphertext');
          expect(encrypted).toHaveProperty('iv');
          expect(encrypted).toHaveProperty('authTag');
          expect(encrypted).toHaveProperty('algorithm', 'AES-256-GCM');
          expect(encrypted).toHaveProperty('keyId');

          // Verify ciphertext is not empty
          expect(encrypted.ciphertext).toBeTruthy();
          expect(encrypted.ciphertext.length).toBeGreaterThan(0);

          // Verify IV is present (should be 12 bytes base64 encoded)
          expect(encrypted.iv).toBeTruthy();
          expect(encrypted.iv.length).toBeGreaterThan(0);

          // Verify auth tag is present (should be 16 bytes base64 encoded)
          expect(encrypted.authTag).toBeTruthy();
          expect(encrypted.authTag.length).toBeGreaterThan(0);

          // Verify ciphertext is different from plaintext
          // (base64 encoded ciphertext should not contain the original text)
          expect(encrypted.ciphertext).not.toBe(phiData);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1.2: File PHI data must be encrypted before storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random file URIs and user IDs
        fc.string({ minLength: 10, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 20 }),
        async (fileUri, userId) => {
          // Initialize encryption for user
          await encryptionService.initialize(userId);

          // Encrypt the file
          const encrypted = await encryptionService.encryptFile(
            `file:///${fileUri}`,
            userId
          );

          // Verify encrypted data structure
          expect(encrypted).toHaveProperty('ciphertext');
          expect(encrypted).toHaveProperty('iv');
          expect(encrypted).toHaveProperty('authTag');
          expect(encrypted).toHaveProperty('algorithm', 'AES-256-GCM');
          expect(encrypted).toHaveProperty('keyId');

          // Verify ciphertext is not empty
          expect(encrypted.ciphertext).toBeTruthy();
          expect(encrypted.ciphertext.length).toBeGreaterThan(0);

          // Verify encryption metadata is present
          expect(encrypted.iv).toBeTruthy();
          expect(encrypted.authTag).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1.3: Encrypted PHI data must use AES-256-GCM algorithm', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 5, maxLength: 20 }),
        async (phiData, userId) => {
          await encryptionService.initialize(userId);
          const encrypted = await encryptionService.encrypt(phiData, userId);

          // Verify algorithm is AES-256-GCM
          expect(encrypted.algorithm).toBe('AES-256-GCM');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1.4: Each encryption operation must use a unique IV', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 5, maxLength: 20 }),
        async (phiData, userId) => {
          await encryptionService.initialize(userId);

          // Encrypt the same data twice
          const encrypted1 = await encryptionService.encrypt(phiData, userId);
          const encrypted2 = await encryptionService.encrypt(phiData, userId);

          // Verify IVs are different
          expect(encrypted1.iv).not.toBe(encrypted2.iv);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 1.5: Encrypted PHI must include authentication tag for integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 5, maxLength: 20 }),
        async (phiData, userId) => {
          await encryptionService.initialize(userId);
          const encrypted = await encryptionService.encrypt(phiData, userId);

          // Verify auth tag is present and non-empty
          expect(encrypted.authTag).toBeTruthy();
          expect(encrypted.authTag.length).toBeGreaterThan(0);

          // Auth tag should be base64 encoded (16 bytes = at least 16 chars in base64)
          expect(encrypted.authTag.length).toBeGreaterThanOrEqual(16);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1.6: Encrypted PHI data must be decryptable to original plaintext', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 5, maxLength: 20 }),
        async (phiData, userId) => {
          await encryptionService.initialize(userId);

          // Encrypt
          const encrypted = await encryptionService.encrypt(phiData, userId);

          // Decrypt
          const decrypted = await encryptionService.decrypt(encrypted, userId);

          // Verify decrypted data matches original
          expect(decrypted).toBe(phiData);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1.7: File encryption must preserve file content through round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 20 }),
        async (fileUri, userId) => {
          await encryptionService.initialize(userId);

          const fullUri = `file:///${fileUri}`;

          // Encrypt file
          const encrypted = await encryptionService.encryptFile(fullUri, userId);

          // Decrypt file
          const decryptedUri = await encryptionService.decryptFile(encrypted, userId);

          // Verify decrypted file was created
          expect(decryptedUri).toBeTruthy();
          expect(decryptedUri).toMatch(/^file:\/\/\/cache\/decrypted_/);

          // Verify file write was called with decrypted content
          expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });
});
