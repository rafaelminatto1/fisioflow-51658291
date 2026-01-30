import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getApp } from 'firebase/app';

/**
 * Initialize App Check for the application
 * Use reCAPTCHA Enterprise for web environments
 */
export const initAppCheck = () => {
  // Only run on the client side
  if (typeof window === 'undefined') return;

  try {
    const app = getApp();

    // In development, enable debug mode to bypass App Check
    if (import.meta.env.DEV) {
      // Set debug token for development
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.log('🛡️ Firebase App Check: Debug mode enabled for development');
    }

    // Use the actual reCAPTCHA Enterprise key from Firebase Console
    // For fisioflow-migration project
    const recaptchaKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY || '6LcJIDQpAAAAAG0tJ2V6wO_XXX-XXX-XXX';

    // Only initialize App Check if we have a valid key (not the placeholder)
    // In production, a valid key is required
    if (recaptchaKey && !recaptchaKey.includes('XXX-XXX')) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('🛡️ Firebase App Check initialized successfully');
    } else if (!import.meta.env.DEV) {
      console.warn('⚠️ Firebase App Check: Valid VITE_RECAPTCHA_ENTERPRISE_KEY not found in production');
    } else {
      console.log('🛡️ Firebase App Check: Skipped (no valid key, using debug mode in development)');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase App Check:', error);
  }
};

/**
 * Get current App Check token for use in custom requests
 */
export const getAppCheckToken = async (): Promise<string | undefined> => {
  if (typeof window === 'undefined') return undefined;

  try {
    const { getToken } = await import('firebase/app-check');
    const appCheck = await import('firebase/app-check').then(m => m.getAppCheck(getApp()));
    return await getToken();
  } catch (error) {
    console.warn('[AppCheck] Could not get token:', error);
    return undefined;
  }
};
