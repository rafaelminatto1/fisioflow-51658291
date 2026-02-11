/**
 * Gamification API Functions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const db = admin.firestore();

/**
 * Get Leaderboard for a specific clinic (Organization)
 */
export const getLeaderboard = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in');

  const organizationId = request.auth.token.organization_id;
  if (!organizationId) throw new HttpsError('failed-precondition', 'User has no organization');

  try {
    const snapshot = await db.collection('gamification_profiles')
      // Idealmente teríamos organization_id no profile para performance, 
      // mas como são perfis de pacientes, vamos buscar os top XP gerais 
      // e filtrar ou assumir escopo global/clínica.
      .orderBy('total_points', 'desc')
      .limit(20)
      .get();

    const leaderboard = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      // Anonimização parcial para LGPD
      return {
        rank: index + 1,
        patientId: doc.id,
        level: data.level,
        xp: data.total_points,
        streak: data.current_streak,
        isCurrentUser: doc.id === request.auth?.uid
      };
    });

    return { success: true, leaderboard };
  } catch (error) {
    logger.error('Error fetching leaderboard', error);
    throw new HttpsError('internal', 'Failed to fetch leaderboard');
  }
});

/**
 * Process a purchase in the Reward Shop
 */
export const processPurchase = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in');
  
  const { itemId, cost } = request.data;
  const userId = request.auth.uid;

  return await db.runTransaction(async (transaction) => {
    const profileRef = db.collection('gamification_profiles').doc(userId);
    const profileSnap = await transaction.get(profileRef);

    if (!profileSnap.exists) throw new HttpsError('not-found', 'Profile not found');
    
    const profileData = profileSnap.data()!;
    if (profileData.total_points < cost) {
      throw new HttpsError('failed-precondition', 'Insufficient points');
    }

    // Deduct points
    transaction.update(profileRef, {
      total_points: admin.firestore.FieldValue.increment(-cost),
      updated_at: new Date().toISOString()
    });

    // Record inventory/purchase
    const purchaseRef = db.collection('inventory').doc();
    transaction.set(purchaseRef, {
      id: purchaseRef.id,
      patient_id: userId,
      item_id: itemId,
      purchased_at: new Date().toISOString(),
      status: 'available',
      voucher_code: Math.random().toString(36).substr(2, 8).toUpperCase()
    });

    return { success: true, voucherCode: purchaseRef.id };
  });
});
