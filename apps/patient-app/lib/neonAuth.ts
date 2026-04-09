import { createAuthClient } from '@neondatabase/neon-js/auth';

/**
 * Custom storage for Better Auth in React Native using Expo SecureStore
 */


/**
 * Neon Auth Client for Patient App
 */
export const authClient = createAuthClient(
  process.env.EXPO_PUBLIC_NEON_AUTH_URL || 'https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth'
) as any;

/**
 * Helper to check if Neon Auth is configured
 */
export const isNeonAuthEnabled = () => {
  return !!process.env.EXPO_PUBLIC_NEON_AUTH_URL;
};
