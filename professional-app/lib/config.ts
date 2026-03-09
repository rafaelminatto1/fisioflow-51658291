/**
 * App Configuration
 * Controls feature flags and API behavior
 */

export const config = {
  // Use Cloud Functions APIs or Firestore directly
  useCloudFunctions: true, // Forcing true as we migrate to standard APIs
  
  // Cloudflare Worker API Configuration
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.seu-dominio.com',
  
  // Feature flags
  enablePushNotifications: false, // Requires Expo project ID
  enableBiometrics: true,
  enableOfflineMode: true,
} as const;
