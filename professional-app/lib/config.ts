/**
 * App Configuration
 * Controls feature flags and API behavior
 */

export const config = {
  // Use Cloud Functions APIs or Firestore directly
  useCloudFunctions: true, // Forcing true as we migrate to standard APIs
  
  // Cloudflare Worker API Configuration
  apiUrl: (function() {
    // Priority: Cloudflare Worker URL, then Environment Variable (if set and not the legacy one)
    const defaultWorkerUrl = 'https://fisioflow-api.rafalegollas.workers.dev';
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    
    console.log(`[Config] Original EXPO_PUBLIC_API_URL: ${envUrl || 'not set'}`);
    
    // If envUrl is set and is NOT the legacy one, we can use it, 
    // but otherwise we MUST use the defaultWorkerUrl to comply with mandates
    let finalUrl = defaultWorkerUrl;
    if (envUrl && !envUrl.includes('moocafisio.com.br') && !envUrl.includes('api-pro')) {
      finalUrl = envUrl;
    }
    
    console.log(`[Config] Final apiUrl being used: ${finalUrl}`);
    return finalUrl;
  })(),
  
  // Legacy API (for fallback)
  legacyApiUrl: 'https://api-pro.moocafisio.com.br',
  
  // Feature flags
  enablePushNotifications: true, // Enabled via Cloudflare Worker + Expo Push
  enableBiometrics: true,
  enableOfflineMode: true,
} as const;
