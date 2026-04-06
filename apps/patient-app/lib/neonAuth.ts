import { createAuthClient } from '@neondatabase/neon-js/auth';

/**
 * Custom storage for Better Auth in React Native using Expo SecureStore
 */


/**
 * Neon Auth Client for Patient App
 */
export const authClient = createAuthClient(
  process.env.EXPO_PUBLIC_NEON_AUTH_URL || 'https://your-auth-endpoint.neonauth.aws.neon.tech'
) as any; // Cast as any because we can't cleanly inject custom storage without additional plugins in this version

/**
 * Helper to check if Neon Auth is configured
 */
export const isNeonAuthEnabled = () => {
  return !!process.env.EXPO_PUBLIC_NEON_AUTH_URL;
};
