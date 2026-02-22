/**
 * Encryption constants for FisioFlow Professional App
 * Centralizes encryption configuration and security parameters
 * Requirements: 2.1, 2.5, 2.8
 */

import { E2EEConfig } from '../types/encryption';

// Re-export ENCRYPTION_CONSTANTS from types
export { ENCRYPTION_CONSTANTS } from '../types/encryption';

/**
 * Default End-to-End Encryption configuration
 * Defines which resource types require E2EE
 */
export const DEFAULT_E2EE_CONFIG: E2EEConfig = {
  enabled: true,
  resourceTypes: ['soap_note', 'photo', 'document'],
  keyRotationDays: 90, // ENCRYPTION_CONSTANTS.KEY_ROTATION_PERIOD_DAYS
};

/**
 * Encryption algorithm used throughout the app
 * AES-256-GCM provides both confidentiality and authenticity
 */
export const ENCRYPTION_ALGORITHM = 'AES-256-GCM' as const;

/**
 * Key rotation period in days
 * Keys are automatically rotated every 90 days for security
 */
export const KEY_ROTATION_PERIOD_DAYS = 90;

/**
 * Resource types that require encryption
 */
export const ENCRYPTED_RESOURCE_TYPES = [
  'soap_note',
  'photo',
  'document',
  'patient_data',
  'medical_history',
] as const;

/**
 * Firestore collections that store encrypted data
 */
export const ENCRYPTED_COLLECTIONS = [
  'soap_records',
  'patient_photos',
  'medical_documents',
  'evaluations',
  'treatment_plans',
] as const;

/**
 * Security configuration for key storage
 */
export const KEY_STORAGE_CONFIG = {
  // Use iOS Keychain via Expo SecureStore
  secureStoreOptions: {
    keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' as const,
  },
  // Key prefix for organization
  keyPrefix: 'fisioflow_enc_',
} as const;
