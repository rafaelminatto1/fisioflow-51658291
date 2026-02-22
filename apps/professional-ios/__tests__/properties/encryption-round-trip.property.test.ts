/**
 * Property-Based Test: SOAP Note Encryption Round Trip
 * 
 * Property 3: SOAP Note Encryption Round Trip
 * Validates: Requirements 2.5
 * 
 * This test generates random SOAP note text (including special characters, Unicode),
 * encrypts it, decrypts it, and verifies equality.
 * 
 * Uses fast-check with 100 iterations to ensure the property holds across
 * all possible SOAP note variations.
 * 
 * NOTE: This test requires fast-check to be installed:
 * npm install --save-dev fast-check @types/fast-check
 * or
 * pnpm add -D fast-check @types/fast-check
 */

import * as fc from 'fast-check';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EncryptionService } from '../../lib/services/encryptionService';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

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

// Mock Web Crypto API with simulated encryption/decryption
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
};

// @ts-ignore
global.crypto = mockCrypto;

describe('Property 3: SOAP Note Encryption Round Trip', () => {
  let encryptionService: EncryptionService;
  const testUserId = 'test-user-property';

  beforeEach(() => {
    encryptionService = EncryptionService.getInstance();
    vi.clearAllMocks();

    // Setup mocks for key generation and storage
    let storedKey: string | null = null;
    let storedMetadata: string | null = null;
    const encryptedDataMap = new Map<string, Uint8Array>();

    (Crypto.getRandomBytesAsync as any).mockImplementation((size: number) => {
      // Generate real random bytes
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
      return Promise.resolve(bytes);
    });

    (Crypto.digestStringAsync as any).mockImplementation(
      async (algorithm: string, data: string) => {
        // Simple hash simulation
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          hash = ((hash << 5) - hash) + data.charCodeAt(i);
          hash = hash & hash;
        }
        return Promise.resolve('hash-' + Math.abs(hash).toString(16));
      }
    );

    (SecureStore.setItemAsync as any).mockImplementation(
      async (key: string, value: string) => {
        if (key.includes('_metadata')) {
          storedMetadata = value;
        } else {
          storedKey = value;
        }
        return Promise.resolve();
      }
    );

    (SecureStore.getItemAsync as any).mockImplementation(async (key: string) => {
      if (key.includes('_metadata')) {
        return Promise.resolve(storedMetadata);
      }
      return Promise.resolve(storedKey);
    });

    (SecureStore.deleteItemAsync as any).mockResolvedValue(undefined);

    // Mock crypto operations for round-trip testing
    (mockCrypto.subtle.importKey as any).mockResolvedValue('mock-crypto-key');
    
    (mockCrypto.subtle.encrypt as any).mockImplementation(
      async (algorithm: any, key: any, data: BufferSource) => {
        // Store the original data for decryption
        const dataArray = new Uint8Array(data as ArrayBuffer);
        const dataKey = Array.from(dataArray).join(',');
        encryptedDataMap.set(dataKey, dataArray);
        
        // Return encrypted data (original data + auth tag)
        const encrypted = new Uint8Array(dataArray.length + 16);
        encrypted.set(dataArray, 0);
        // Add mock auth tag
        for (let i = 0; i < 16; i++) {
          encrypted[dataArray.length + i] = i;
        }
        return encrypted.buffer;
      }
    );

    (mockCrypto.subtle.decrypt as any).mockImplementation(
      async (algorithm: any, key: any, data: BufferSource) => {
        // Extract original data (remove auth tag)
        const dataArray = new Uint8Array(data as ArrayBuffer);
        const originalData = dataArray.slice(0, -16);
        
        // Verify auth tag (simple check)
        const authTag = dataArray.slice(-16);
        let validTag = true;
        for (let i = 0; i < 16; i++) {
          if (authTag[i] !== i) {
            validTag = false;
            break;
          }
        }
        
        if (!validTag) {
          throw new Error('Authentication tag verification failed');
        }
        
        return originalData.buffer;
      }
    );
  });

  /**
   * Arbitrary generator for SOAP note text
   * Generates realistic SOAP note content with various characters
   */
  const soapNoteArbitrary = fc.record({
    subjective: fc.string({ minLength: 10, maxLength: 500 }),
    objective: fc.string({ minLength: 10, maxLength: 500 }),
    assessment: fc.string({ minLength: 10, maxLength: 500 }),
    plan: fc.string({ minLength: 10, maxLength: 500 }),
    specialChars: fc.constantFrom(
      'áéíóúàèìòùâêîôûãõñç',
      '中文字符',
      'Русский текст',
      'العربية',
      '🔒🏥💊',
      '!@#$%^&*()_+-=[]{}|;:,.<>?',
      '\n\t\r',
      ''
    ),
  }).map((parts) => {
    return `SOAP Note:
Subjective: ${parts.subjective} ${parts.specialChars}
Objective: ${parts.objective}
Assessment: ${parts.assessment}
Plan: ${parts.plan}`;
  });

  /**
   * Property Test 1: Encryption and decryption should be inverse operations
   * For any SOAP note text, encrypt(decrypt(text)) === text
   */
  it('should successfully encrypt and decrypt any SOAP note text', async () => {
    // Initialize encryption once
    await encryptionService.initialize(testUserId);

    await fc.assert(
      fc.asyncProperty(soapNoteArbitrary, async (soapNote) => {
        // Encrypt the SOAP note
        const encrypted = await encryptionService.encrypt(soapNote, testUserId);

        // Verify encrypted data structure
        expect(encrypted).toHaveProperty('ciphertext');
        expect(encrypted).toHaveProperty('iv');
        expect(encrypted).toHaveProperty('authTag');
        expect(encrypted.algorithm).toBe('AES-256-GCM');

        // Decrypt the SOAP note
        const decrypted = await encryptionService.decrypt(encrypted, testUserId);

        // Property: Decrypted text must equal original text
        expect(decrypted).toBe(soapNote);
      }),
      { numRuns: 100 } // Run 100 iterations as specified
    );
  }, 60000); // 60 second timeout for 100 iterations

  /**
   * Property Test 2: Encrypted data should be different from original
   * For any SOAP note text, the ciphertext should not contain the original text
   */
  it('should produce ciphertext different from original text', async () => {
    await encryptionService.initialize(testUserId);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 20, maxLength: 200 }),
        async (soapNote) => {
          const encrypted = await encryptionService.encrypt(soapNote, testUserId);

          // Property: Ciphertext should not contain original text
          // (Base64 encoded ciphertext should be different)
          expect(encrypted.ciphertext).not.toContain(soapNote);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property Test 3: Same text encrypted twice should produce different ciphertexts
   * Due to unique IV per operation
   */
  it('should produce different ciphertexts for same text', async () => {
    await encryptionService.initialize(testUserId);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (soapNote) => {
          const encrypted1 = await encryptionService.encrypt(soapNote, testUserId);
          const encrypted2 = await encryptionService.encrypt(soapNote, testUserId);

          // Property: Different IVs should produce different ciphertexts
          expect(encrypted1.iv).not.toBe(encrypted2.iv);
          expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

          // But both should decrypt to the same original text
          const decrypted1 = await encryptionService.decrypt(encrypted1, testUserId);
          const decrypted2 = await encryptionService.decrypt(encrypted2, testUserId);

          expect(decrypted1).toBe(soapNote);
          expect(decrypted2).toBe(soapNote);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property Test 4: Empty string should encrypt and decrypt correctly
   */
  it('should handle empty SOAP notes', async () => {
    await encryptionService.initialize(testUserId);

    const encrypted = await encryptionService.encrypt('', testUserId);
    const decrypted = await encryptionService.decrypt(encrypted, testUserId);

    expect(decrypted).toBe('');
  });

  /**
   * Property Test 5: Very long SOAP notes should encrypt and decrypt correctly
   */
  it('should handle very long SOAP notes', async () => {
    await encryptionService.initialize(testUserId);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5000, maxLength: 10000 }),
        async (longSoapNote) => {
          const encrypted = await encryptionService.encrypt(longSoapNote, testUserId);
          const decrypted = await encryptionService.decrypt(encrypted, testUserId);

          expect(decrypted).toBe(longSoapNote);
          expect(decrypted.length).toBe(longSoapNote.length);
        }
      ),
      { numRuns: 10 } // Fewer iterations for long strings
    );
  }, 60000);

  /**
   * Property Test 6: Unicode characters should be preserved
   */
  it('should preserve Unicode characters in SOAP notes', async () => {
    await encryptionService.initialize(testUserId);

    await fc.assert(
      fc.asyncProperty(
        fc.unicodeString({ minLength: 10, maxLength: 200 }),
        async (unicodeSoapNote) => {
          const encrypted = await encryptionService.encrypt(unicodeSoapNote, testUserId);
          const decrypted = await encryptionService.decrypt(encrypted, testUserId);

          expect(decrypted).toBe(unicodeSoapNote);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property Test 7: Special medical characters should be preserved
   */
  it('should preserve special medical characters', async () => {
    await encryptionService.initialize(testUserId);

    const medicalChars = [
      '°C', '°F', 'µg', 'mg/dL', 'mmHg', 'bpm', 'kg/m²',
      '±', '≤', '≥', '×', '÷', '→', '←', '↑', '↓',
      'α', 'β', 'γ', 'δ', 'Δ', 'Σ',
    ];

    for (const char of medicalChars) {
      const soapNote = `Patient vitals: Temperature ${char} 37.5`;
      const encrypted = await encryptionService.encrypt(soapNote, testUserId);
      const decrypted = await encryptionService.decrypt(encrypted, testUserId);

      expect(decrypted).toBe(soapNote);
      expect(decrypted).toContain(char);
    }
  });

  /**
   * Property Test 8: Newlines and whitespace should be preserved
   */
  it('should preserve newlines and whitespace', async () => {
    await encryptionService.initialize(testUserId);

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 3, maxLength: 10 }),
        async (lines) => {
          const soapNote = lines.join('\n');
          const encrypted = await encryptionService.encrypt(soapNote, testUserId);
          const decrypted = await encryptionService.decrypt(encrypted, testUserId);

          expect(decrypted).toBe(soapNote);
          expect(decrypted.split('\n').length).toBe(lines.length);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property Test 9: Tampering with ciphertext should cause decryption to fail
   */
  it('should detect tampering with ciphertext', async () => {
    await encryptionService.initialize(testUserId);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 20, maxLength: 100 }),
        async (soapNote) => {
          const encrypted = await encryptionService.encrypt(soapNote, testUserId);

          // Tamper with ciphertext by changing one character
          const tamperedCiphertext = encrypted.ciphertext.slice(0, -1) + 'X';
          const tamperedData = {
            ...encrypted,
            ciphertext: tamperedCiphertext,
          };

          // Property: Tampering should cause decryption to fail
          await expect(
            encryptionService.decrypt(tamperedData, testUserId)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 50 } // Fewer iterations since we expect failures
    );
  }, 60000);

  /**
   * Property Test 10: Tampering with auth tag should cause decryption to fail
   */
  it('should detect tampering with authentication tag', async () => {
    await encryptionService.initialize(testUserId);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 20, maxLength: 100 }),
        async (soapNote) => {
          const encrypted = await encryptionService.encrypt(soapNote, testUserId);

          // Tamper with auth tag
          const tamperedAuthTag = encrypted.authTag.slice(0, -1) + 'Y';
          const tamperedData = {
            ...encrypted,
            authTag: tamperedAuthTag,
          };

          // Property: Tampering should cause decryption to fail
          await expect(
            encryptionService.decrypt(tamperedData, testUserId)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);
});
