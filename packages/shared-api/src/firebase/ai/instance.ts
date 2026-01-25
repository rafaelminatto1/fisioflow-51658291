/**
 * Firebase AI Logic Instance
 *
 * Provides access to the Firebase AI Logic service instance.
 *
 * @module firebase/ai/instance
 */

import { getFirebaseAI } from '@firebase/ai';
import app from '../config';

let aiInstance: ReturnType<typeof getFirebaseAI> | null = null;

/**
 * Get Firebase AI Logic service instance
 */
export function getFirebaseAI(): ReturnType<typeof getFirebaseAI> | null {
  if (aiInstance === null) {
    try {
      aiInstance = getFirebaseAI(app);
    } catch (error) {
      console.warn('Firebase AI Logic service not available:', error);
      aiInstance = null;
    }
  }
  return aiInstance;
}
