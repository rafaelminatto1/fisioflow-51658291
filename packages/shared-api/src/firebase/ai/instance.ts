/**
 * Firebase AI Logic Instance
 *
 * Provides access to the Firebase AI Logic service instance.
 *
 * @module firebase/ai/instance
 */

import { getFirebaseAI as getFirebaseAISdk } from '@firebase/ai';
import app from '../config';

let aiInstance: ReturnType<typeof getFirebaseAISdk> | null = null;

/**
 * Get Firebase AI Logic service instance
 */
export function getFirebaseAI(): ReturnType<typeof getFirebaseAISdk> | null {
  if (aiInstance === null) {
    try {
      aiInstance = getFirebaseAISdk(app);
    } catch (error) {
      console.warn('Firebase AI Logic service not available:', error);
      aiInstance = null;
    }
  }
  return aiInstance;
}
