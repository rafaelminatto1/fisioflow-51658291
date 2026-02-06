
// Extend global self type for Firebase App Check debug token

import { getApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { fisioLogger as logger } from '@/lib/errors/logger';

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
  if (typeof window === 'undefined') return;

  try {
    const app = getApp();
    
    // Configurar token de debug para desenvolvimento local
    if (import.meta.env.DEV) {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      logger.debug('Firebase App Check: Debug mode enabled', null, 'app-check');
    }

    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider('6Lfqws8qAAAAAAIn9_IDNpHTUK_Nb_IsZ_X-_X_X'), 
      isTokenAutoRefreshEnabled: true
    });

    logger.info('Firebase App Check: Initialized successfully', null, 'app-check');
    return appCheck;
  } catch (error) {
    logger.error('Firebase App Check: Initialization failed', error, 'app-check');
  }
};

/**
 * Get current App Check token for use in custom requests
 */
export const getAppCheckToken = async (): Promise<string | undefined> => {
  if (typeof window === 'undefined') return undefined;

  try {
    const { getToken } = await import('firebase/app-check');
    const _appCheck = await import('firebase/app-check').then(m => m.getAppCheck(getApp()));
    return await getToken();
  } catch (error) {
    logger.debug('Could not get App Check token', error, 'app-check');
    return undefined;
  }
};
