/**
 * Admin Function: Create Firebase User
 * Executar uma vez para criar usuário inicial
 */


// Initialize Firebase Admin

import * as functions from 'firebase-functions/v2';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAdminDb } from '../init';

if (!getApps().length) {
  initializeApp();
}

export const createAdminUser = functions.https.onCall(
  {
    region: 'southamerica-east1',
  },
  async (request) => {
    const { email, password, displayName, role } = request.data;

    const auth = getAuth();
    const db = getAdminDb();

    try {
      // Check if user already exists
      try {
        const userRecord = await auth.getUserByEmail(email);
        if (userRecord) {
          throw new functions.https.HttpsError('already-exists', 'User already exists');
        }
      } catch (error) {
        // User doesn't exist - continue
      }

      // Create user
      const user = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });

      // Create user document in Firestore
      await db.collection('users').doc(user.uid).set({
        email,
        displayName,
        role: role || 'admin',
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        uid: user.uid,
        message: 'User created successfully',
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', 'Failed to create user');
    }
  }
);

export const createAdminUserHandler = async () => {
  const auth = getAuth();
  console.log('Auth service initialized');

  try {
    const users = await auth.listUsers(100);
    console.log(`Found ${users.users.length} users`);
    return { success: true, count: users.users.length };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: (error as Error).message };
  }
};
