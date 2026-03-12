/**
 * App Configuration
 * Controls feature flags and API behavior
 */

export const config = {
  // Use Cloud Functions APIs or Firestore directly
  useCloudFunctions: true, // Forcing true as we migrate to standard APIs
  
  // Cloudflare Worker API Configuration
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://fisioflow-api.rafalegollas.workers.dev',
  
  // Legacy API (for fallback)
  legacyApiUrl: 'https://api-pro.moocafisio.com.br',
  
  // Feature flags
  enablePushNotifications: true, // Enabled via Cloudflare Worker + Expo Push
  enableBiometrics: true,
  enableOfflineMode: true,
} as const;
