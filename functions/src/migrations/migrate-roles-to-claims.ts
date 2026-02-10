import * as admin from 'firebase-admin';
import { adminDb } from '../init';

/**
 * Migration: Move roles from Firestore 'profiles' collection to Auth Custom Claims.
 * This improves security and performance by avoiding extra Firestore reads.
 */
export const migrateRolesToClaimsHandler = async (request: any) => {
    // Security check: Only admin can run this migration
    if (!request.auth?.token?.admin && request.auth?.token?.role !== 'admin') {
        // Allow if it's the specific bootstrap user (optional, adjust as needed)
        const bootstrapUid = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2';
        if (request.auth?.uid !== bootstrapUid) {
            throw new Error('Permission denied. Only admins can run this migration.');
        }
    }

    const auth = admin.auth();
    const profilesRef = adminDb.collection('profiles');
    
    // Batch process to avoid timeout (though for a migration, we might want to use a script or task queue)
    // For now, we'll process a batch of 500 users. Run multiple times if needed.
    const snapshot = await profilesRef.limit(500).get();
    
    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: [] as any[]
    };

    console.log(`[Migration] Found ${snapshot.size} profiles to process.`);

    const updates = snapshot.docs.map(async (doc) => {
        const profile = doc.data();
        const uid = doc.id;
        const role = profile.role;
        const organizationId = profile.organization_id;

        if (!role) {
            results.skipped++;
            return;
        }

        try {
            // Get current claims
            const userRecord = await auth.getUser(uid);
            const currentClaims = userRecord.customClaims || {};

            // Check if update is needed
            if (currentClaims.role === role && currentClaims.organizationId === organizationId) {
                results.skipped++;
                return;
            }

            // Set custom claims
            // We preserve existing claims like 'admin' if they exist, but overwrite role/org
            const newClaims = {
                ...currentClaims,
                role: role,
                organizationId: organizationId || null,
                // Add specific boolean flags for easier rules
                isProfessional: ['fisioterapeuta', 'estagiario', 'owner', 'admin'].includes(role),
                isAdmin: role === 'admin' || currentClaims.admin === true
            };

            await auth.setCustomUserClaims(uid, newClaims);
            results.success++;
            console.log(`[Migration] Updated claims for user ${uid}: ${role}`);
        } catch (error: any) {
            console.error(`[Migration] Error updating user ${uid}:`, error);
            results.failed++;
            results.errors.push({ uid, error: error.message });
        }
    });

    await Promise.all(updates);

    return {
        message: 'Migration completed',
        stats: results
    };
};
