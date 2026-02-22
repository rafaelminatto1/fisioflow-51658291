/**
 * Authentication and user types
 */

export type UserRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'recepcionista' | 'paciente' | 'owner';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  photo_url?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  // Additional fields for professionals
  specialties?: string[];
  license_number?: string;
  bio?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface SignUpData extends SignInData {
  fullName: string;
  phone?: string;
  role?: UserRole;
}

export interface AuthState {
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Biometric authentication types
 * Requirements: 5.1, 5.2, 5.7
 */

export type BiometricType = 'faceId' | 'touchId' | 'none';

/**
 * Biometric authentication configuration
 * Stored in Firestore collection: biometric_configs
 */
export interface BiometricConfig {
  userId: string;
  enabled: boolean;
  type: BiometricType;
  fallbackEnabled: boolean;
  pinHash?: string; // Hashed PIN for fallback authentication
  requireOnLaunch: boolean;
  requireAfterBackground: boolean;
  backgroundTimeout: number; // Seconds (default 300 = 5 minutes)
  failedAttempts: number;
  lockedUntil?: Date; // Account locked until this time after failed attempts
}

/**
 * Two-Factor Authentication types
 * Requirements: 5.5
 */

export type TwoFactorMethod = 'sms' | 'email' | 'authenticator';

/**
 * Two-Factor Authentication configuration
 * Stored in Firestore collection: two_factor_configs
 */
export interface TwoFactorConfig {
  userId: string;
  enabled: boolean;
  method: TwoFactorMethod;
  secret?: string; // For authenticator apps (TOTP secret)
  phoneNumber?: string; // For SMS verification
  email?: string; // For email verification codes
  backupCodes: string[]; // Hashed backup codes for recovery
  verifiedAt?: Date;
}

/**
 * Session management configuration
 * Requirements: 2.10, 5.3, 5.4
 */
export interface SessionConfig {
  userId: string;
  sessionTimeout: number; // Minutes (default 15)
  autoLogoutEnabled: boolean;
  lastActivityAt: Date;
}

/**
 * Authentication constants
 */
export const AUTH_CONSTANTS = {
  SESSION_TIMEOUT_MINUTES: 15,
  BACKGROUND_TIMEOUT_SECONDS: 300, // 5 minutes
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  MIN_PIN_LENGTH: 6,
  MIN_PASSWORD_LENGTH: 8,
} as const;
