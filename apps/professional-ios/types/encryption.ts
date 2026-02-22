/**
 * Encryption type definitions for FisioFlow Professional App
 * Implements AES-256-GCM encryption for PHI data protection
 * Requirements: 2.1, 2.5, 2.8
 */

/**
 * Encryption algorithm used throughout the app
 */
export type EncryptionAlgorithm = 'AES-256-GCM';

/**
 * Encryption key metadata
 * Keys are never stored directly - only hashes for verification
 * Actual keys are stored in Expo SecureStore (iOS Keychain)
 */
export interface EncryptionKey {
  id: string;
  userId: string;
  algorithm: EncryptionAlgorithm;
  keyHash: string; // SHA-256 hash of the key for verification
  createdAt: Date;
  rotatedAt?: Date;
  expiresAt?: Date; // Keys expire after 90 days
}

/**
 * Encrypted data structure
 * Contains all information needed to decrypt data
 */
export interface EncryptedData {
  ciphertext: string; // Base64-encoded encrypted data
  iv: string; // Initialization vector (Base64)
  authTag: string; // Authentication tag for GCM mode (Base64)
  algorithm: EncryptionAlgorithm;
  keyId: string; // Reference to the encryption key used
}

/**
 * End-to-End Encryption configuration
 * Defines which resource types use E2EE
 */
export interface E2EEConfig {
  enabled: boolean;
  resourceTypes: ('soap_note' | 'photo' | 'document')[];
  keyRotationDays: number; // Default: 90 days
}

/**
 * Encryption constants
 */
export const ENCRYPTION_CONSTANTS = {
  ALGORITHM: 'AES-256-GCM' as const,
  KEY_ROTATION_PERIOD_DAYS: 90,
  KEY_SIZE_BITS: 256,
  IV_SIZE_BYTES: 12, // 96 bits for GCM
  AUTH_TAG_SIZE_BYTES: 16, // 128 bits
  PBKDF2_ITERATIONS: 100000, // For key derivation
} as const;
