import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getApp } from 'firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

// Extend global self type for Firebase App Check debug token
declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
  interface WorkerGlobalScope {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

/**
 * Initialize App Check for the application
 * Use reCAPTCHA Enterprise for web environments
 */
export const initAppCheck = () => {
  // TEMPORARILY DISABLED: App Check is causing network issues with Firebase Auth
  // TODO: Re-enable after fixing the configuration
  logger.debug('Firebase App Check: DISABLED temporarily to fix login issues', null, 'app-check');
  return;
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
    logger.warn('Could not get App Check token', error, 'app-check');
    return undefined;
  }
};
