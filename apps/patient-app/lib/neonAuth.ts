import { createAuthClient } from '@neondatabase/neon-js/auth';
import * as SecureStore from 'expo-secure-store';

/**
 * Custom storage for Better Auth in React Native using Expo SecureStore
 */
const expoStorage = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

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
