/**
 * App Configuration
 * Controls feature flags and API behavior
 */

export const config = {
  // Use Cloud Functions APIs or Firestore directly
  useCloudFunctions: false, // Set to true when Cloud Functions are deployed
  
  // Firebase project configuration
  projectNumber: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_NUMBER || '412418905255',
  region: process.env.EXPO_PUBLIC_FIREBASE_REGION || 'southamerica-east1',
  
  // Feature flags
  enablePushNotifications: false, // Requires Expo project ID
  enableBiometrics: true,
  enableOfflineMode: true,
} as const;
