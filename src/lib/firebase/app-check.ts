/**
 * Firebase App Check Implementation
 *
 * Protects Firebase resources and AI services from abuse.
 * Implements App Check with reCAPTCHA v3 and debug tokens for development.
 *
 * @module lib/firebase/app-check
 */

import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check';
import { app } from '@fisioflow/shared-api/firebase';

/**
 * App Check configuration
 */
interface AppCheckConfig {
  /** reCAPTCHA v3 site key */
  recaptchaSiteKey: string;

  /** Enable debug mode for development */
  debug?: boolean;

  /** Token auto-refresh enabled */
  isTokenAutoRefreshEnabled?: boolean;

  /** Custom token refresh threshold (ms) */
  tokenRefreshThreshold?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AppCheckConfig = {
  recaptchaSiteKey: process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY || '',
  debug: process.env.NODE_ENV === 'development',
  isTokenAutoRefreshEnabled: true,
  tokenRefreshThreshold: 3600000, // 1 hour
};

/**
 * App Check manager class
 */
class AppCheckManager {
  private initialized = false;
  private config: AppCheckConfig;
  private appCheckInstance: any = null;
  private currentToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config: AppCheckConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize App Check
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Validate reCAPTCHA site key
      if (!this.config.recaptchaSiteKey) {
        console.warn('App Check: reCAPTCHA site key not provided, skipping initialization');
        return;
      }

      // Set debug token for development
      if (this.config.debug && typeof window !== 'undefined') {
        // Pass debug token through self._firebaseAppCheck
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
          process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN || true;
      }

      // Initialize App Check
      this.appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(this.config.recaptchaSiteKey),
        isTokenAutoRefreshEnabled: this.config.isTokenAutoRefreshEnabled ?? true,
      });

      this.initialized = true;
      console.log('App Check initialized successfully');
    } catch (error) {
      console.error('Failed to initialize App Check:', error);
      throw new Error(`App Check initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current App Check token
   * Returns cached token if still valid, otherwise fetches new token
   */
  async getToken(forceRefresh = false): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if we need to refresh
    const shouldRefresh =
      forceRefresh ||
      !this.currentToken ||
      !this.tokenExpiry ||
      Date.now() > this.tokenExpiry;

    if (shouldRefresh) {
      try {
        const result = await getToken(this.appCheckInstance, forceRefresh);
        this.currentToken = result.token;
        this.tokenExpiry = Date.now() + (this.config.tokenRefreshThreshold || 3600000);
      } catch (error) {
        console.error('Failed to get App Check token:', error);

        // In development, continue without token
        if (this.config.debug) {
          console.warn('App Check token fetch failed, continuing in debug mode');
          return 'debug-token';
        }

        throw new Error(`Failed to get App Check token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return this.currentToken!;
  }

  /**
   * Invalidate current token
   */
  invalidateToken(): void {
    this.currentToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Check if App Check is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get App Check instance
   */
  getInstance(): any {
    return this.appCheckInstance;
  }
}

/**
 * Singleton instance
 */
let appCheckManager: AppCheckManager | null = null;

/**
 * Get or create App Check manager
 */
export function getAppCheckManager(config?: AppCheckConfig): AppCheckManager {
  if (!appCheckManager) {
    appCheckManager = new AppCheckManager(config);
  }
  return appCheckManager;
}

/**
 * Initialize App Check
 */
export async function initializeAppCheck(config?: AppCheckConfig): Promise<void> {
  const manager = getAppCheckManager(config);
  await manager.initialize();
}

/**
 * Get App Check token
 */
export async function getAppCheckToken(forceRefresh = false): Promise<string> {
  const manager = getAppCheckManager();
  return manager.getToken(forceRefresh);
}

/**
 * Invalidate App Check token
 */
export function invalidateAppCheckToken(): void {
  const manager = getAppCheckManager();
  manager.invalidateToken();
}

/**
 * Check if App Check is ready
 */
export function isAppCheckReady(): boolean {
  const manager = getAppCheckManager();
  return manager.isReady();
}

/**
 * App Check protected request wrapper
 * Automatically adds App Check token to headers
 */
export async function withAppCheck<T>(
  requestFn: (token: string) => Promise<T>
): Promise<T> {
  try {
    const token = await getAppCheckToken();
    return await requestFn(token);
  } catch (error) {
    console.error('App Check protected request failed:', error);

    // Retry with force refresh if token might be stale
    try {
      const token = await getAppCheckToken(true);
      return await requestFn(token);
    } catch (retryError) {
      throw new Error(`App Check request failed: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
    }
  }
}

/**
 * React Hook for App Check
 */
export function useAppCheck() {
  return {
    getToken: getAppCheckToken,
    invalidate: invalidateAppCheckToken,
    isReady: isAppCheckReady,
    initialize: initializeAppCheck,
  };
}

/**
 * Export types
 */
export type { AppCheckConfig };
