import { logger } from 'firebase-functions';
import { getAdminDb, getPool } from '../init';
// import { sendNotification } from '../workflows/notifications';

// Use v1 trigger for now as v2 onUserCreated is still in preview/beta in some regions
// and we want stability. Using the v1 syntax wrapper if available or just v1.
// However, since we are mixing v1 and v2, let's try to use v1 for auth triggers
// to avoid complexity with Identity Platform restrictions.

import * as functions from 'firebase-functions/v1';

/**
 * Trigger fired when a new user is created in Firebase Auth.
 * Creates the user profile in Firestore with 'pending' role.
 * Notifies the admin about the new registration.
 */
export const onUserCreated = functions
    .region('southamerica-east1')
    .auth.user()
    .onCreate(async (user: functions.auth.UserRecord) => {
        const db = getAdminDb();
        const pool = getPool();
        const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
        const ADMIN_EMAIL = 'rafael.minatto@yahoo.com.br';

        try {
            logger.info(`[onUserCreated] Creating profile for user: ${user.uid} (${user.email})`);

            // 1. Create Profile in Firestore
            // We use set with merge: true to be idempotent
            const profileRef = db.collection('profiles').doc(user.uid);

            // Check if exists first to avoid overwriting if somehow created
            const profileSnap = await profileRef.get();

            let organizationId = DEFAULT_ORG_ID;

            // Try to find a default organization if not hardcoded
            if (!profileSnap.exists) {
                const orgQuery = await db.collection('organizations')
                    .where('active', '==', true)
                    .limit(1)
                    .get();

                if (!orgQuery.empty) {
                    organizationId = orgQuery.docs[0].id;
                }
            }

            const now = new Date().toISOString();
            const fullName = user.displayName || 'Novo Usuário';

            // 1.1 Sync to PostgreSQL (Critical for V2 API)
            try {
                await pool.query(
                    `INSERT INTO profiles (
                        user_id,
                        organization_id,
                        full_name,
                        email,
                        role,
                        email_verified,
                        is_active,
                        avatar_url,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                    ON CONFLICT (user_id) DO NOTHING`,
                    [
                        user.uid,
                        organizationId,
                        fullName,
                        user.email,
                        'pending', // Default role
                        user.emailVerified || false,
                        true, // is_active
                        user.photoURL || null
                    ]
                );
                logger.info(`[onUserCreated] Profile synced to PostgreSQL for ${user.uid}`);
            } catch (sqlError) {
                logger.error(`[onUserCreated] Failed to sync profile to PostgreSQL:`, sqlError);
                // Don't throw here to ensure Firestore write still happens/completes
            }

            if (!profileSnap.exists) {
                await profileRef.set({
                    user_id: user.uid,
                    full_name: fullName,
                    email: user.email,
                    role: 'pending', // DEFAULT ROLE IS NOW PENDING
                    email_verified: user.emailVerified || false,
                    avatar_url: user.photoURL || null,
                    organization_id: organizationId,
                    is_active: true,
                    created_at: now,
                    updated_at: now,
                    onboarding_completed: false
                });
                logger.info(`[onUserCreated] Profile created in Firestore for ${user.uid}`);
            } else {
                logger.info(`[onUserCreated] Profile already exists in Firestore for ${user.uid}, skipping creation.`);
            }

            // 2. Notify Admin
            const notificationRef = db.collection('notifications').doc();
            await notificationRef.set({
                user_id: 'SYSTEM', // System notification
                target_user_email: ADMIN_EMAIL, // Who receives it
                type: 'USER_REGISTRATION',
                title: 'Novo Usuário Cadastrado',
                body: `Usuário ${user.email} se cadastrou e aguarda aprovação.`,
                metadata: {
                    new_user_id: user.uid,
                    new_user_email: user.email
                },
                status: 'pending',
                created_at: now,
                channel: 'email'
            });

            logger.info(`[onUserCreated] Admin notification queued for ${ADMIN_EMAIL}`);

        } catch (error) {
            logger.error(`[onUserCreated] Error processing new user ${user.uid}:`, error);
        }
    });