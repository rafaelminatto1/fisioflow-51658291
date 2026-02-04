import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAdminDb, getAdminAuth } from '../init';
import { logger } from 'firebase-functions';

// Types
interface UserData {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: string;
    organizationId?: string;
    disabled: boolean;
    metadata: {
        creationTime: string;
        lastSignInTime: string;
    };
}

/**
 * List all users with their roles (Admin only)
 */
/**
 * List all users with their roles (Admin only)
 */
export const listUsersHandler = async (request: any) => {
    const { auth } = request;

    // 1. Security Check: Must be authenticated
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const db = getAdminDb();

    // 2. Security Check: Must be Admin
    const callerProfileSnap = await db.collection('profiles').doc(auth.uid).get();
    const callerRole = callerProfileSnap.data()?.role;

    if (callerRole !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can list users');
    }

    try {
        const users: UserData[] = [];
        const authUsers = await getAdminAuth().listUsers(1000); // Limit to 1000 for now

        // Fetch all profiles to map roles
        const profilesSnap = await db.collection('profiles').get();
        const profilesMap = new Map();
        profilesSnap.forEach(doc => {
            profilesMap.set(doc.id, doc.data());
        });

        for (const user of authUsers.users) {
            const profile = profilesMap.get(user.uid);
            users.push({
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || profile?.full_name || 'No Name',
                photoURL: user.photoURL || profile?.avatar_url,
                role: profile?.role || 'unknown',
                organizationId: profile?.organization_id,
                disabled: user.disabled,
                metadata: {
                    creationTime: user.metadata.creationTime,
                    lastSignInTime: user.metadata.lastSignInTime,
                }
            });
        }

        return { users };

    } catch (error) {
        logger.error('[listUsers] Error listing users:', error);
        throw new HttpsError('internal', 'Failed to list users');
    }
};

export const listUsers = onCall(
    {
        cors: true,
        region: 'southamerica-east1',
    },
    listUsersHandler
);

/**
 * Update a user's role (Admin only)
 */
/**
 * Update a user's role (Admin only)
 */
export const updateUserRoleHandler = async (request: any) => {
    const { auth, data } = request;

    // 1. Security Check
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { targetUserId, newRole } = data;
    if (!targetUserId || !newRole) {
        throw new HttpsError('invalid-argument', 'Missing targetUserId or newRole');
    }

    const validRoles = ['admin', 'fisioterapeuta', 'estagiario', 'paciente', 'pending'];
    if (!validRoles.includes(newRole)) {
        throw new HttpsError('invalid-argument', `Invalid role: ${newRole}`);
    }

    const db = getAdminDb();
    const callerProfileSnap = await db.collection('profiles').doc(auth.uid).get();
    const callerRole = callerProfileSnap.data()?.role;

    if (callerRole !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can manage roles');
    }

    try {
        // Update Firestore Profile
        await db.collection('profiles').doc(targetUserId).update({
            role: newRole,
            updated_at: new Date().toISOString()
        });

        // Optional: Set Custom Claim on Firebase Auth for faster client role checking
        // but for now relying on Firestore profile is consistent with current architecture

        logger.info(`[updateUserRole] Admin ${auth.uid} updated user ${targetUserId} to role ${newRole}`);

        return { success: true };

    } catch (error) {
        logger.error('[updateUserRole] Error updating role:', error);
        throw new HttpsError('internal', 'Failed to update user role');
    }
};

export const updateUserRole = onCall(
    {
        cors: true,
        region: 'southamerica-east1',
    },
    updateUserRoleHandler
);
