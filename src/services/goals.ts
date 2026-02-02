/**
 * Goals Service - Migrated to Firebase
 */

import { db } from '@/integrations/firebase/app';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, writeBatch, documentId } from '@/integrations/firebase/app';
import { getFirebaseFunctions } from '@/integrations/firebase/functions';

import { httpsCallable } from 'firebase/functions';
import { Auth } from 'firebase/auth';
import { fisioLogger as logger } from '@/lib/errors/logger';


// Types matching the DB schema manually for now (until types.ts is regenerated)
export type GoalProfileStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface GoalProfile {
    id: string;
    name: string;
    description: string;
    applicable_tests: string[]; // Stored as array of strings
    quality_gate: Record<string, unknown>;
    evidence: Record<string, unknown>;
    tags: string[];
    status: GoalProfileStatus;
    version: number;
    published_at: string | null;
    published_by_user_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface GoalTarget {
    id: string;
    profile_id: string;
    key: string;
    mode: 'min' | 'max' | 'exact';
    min: number | null;
    max: number | null;
    min_delta_abs: number | null;
    min_delta_pct: number | null;
    is_optional: boolean;
    is_enabled: boolean;
    sort_order: number;
    label_override: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// Helper to get current user - this should be passed in or use useAuth() in components
let authInstance: Auth | null = null;
export const setAuthInstance = (auth: Auth) => {
    authInstance = auth;
};

const getCurrentUserId = async (): Promise<string | null> => {
    if (!authInstance) {
        logger.warn('Auth instance not set in goals service', undefined, 'goals');
        return null;
    }
    const user = authInstance.currentUser;
    return user?.uid || null;
};

export const GoalService = {
    async getProfiles(status?: GoalProfileStatus) {
        // Build query
        let q = query(
            collection(db, 'goal_profiles'),
            orderBy('updated_at', 'desc')
        );

        const snapshot = await getDocs(q);
        const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GoalProfile));

        // Filter by status if needed (client-side for status since we can't have multiple range filters)
        let filteredProfiles = profiles;
        if (status) {
            filteredProfiles = profiles.filter(p => p.status === status);
        }

        // Fetch targets for all profiles
        if (filteredProfiles.length > 0) {
            const profileIds = filteredProfiles.map(p => p.id);

            // Firestore has a limit of 10 items per 'in' query, so we need to chunk
            const chunkSize = 10;
            const chunks = [];
            for (let i = 0; i < profileIds.length; i += chunkSize) {
                chunks.push(profileIds.slice(i, i + chunkSize));
            }

            const allTargets: GoalTarget[] = [];
            for (const chunk of chunks) {
                const targetsQuery = query(
                    collection(db, 'goal_targets'),
                    where('profile_id', 'in', chunk)
                );
                const targetsSnapshot = await getDocs(targetsQuery);
                allTargets.push(...targetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GoalTarget)));
            }

            // Attach targets to profiles
            return filteredProfiles.map(profile => ({
                ...profile,
                targets: allTargets.filter(t => t.profile_id === profile.id)
            }));
        }

        return filteredProfiles;
    },

     * Fetch a single profile by ID w/ targets
     */
    async getProfileById(id: string) {
        const profileDoc = await getDoc(doc(db, 'goal_profiles', id));

        if (!profileDoc.exists()) {
            throw new Error('Goal profile not found');
        }

        const profile = { id: profileDoc.id, ...profileDoc.data() } as GoalProfile;

        // Fetch targets
        const targetsQuery = query(
            collection(db, 'goal_targets'),
            where('profile_id', '==', id)
        );
        const targetsSnapshot = await getDocs(targetsQuery);
        const targets = targetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GoalTarget));

        return {
            ...profile,
            targets
        };
    },

     * Internal helper to log audits
     */
    async logAudit(
        action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'ARCHIVE',
        entity: 'GoalProfile' | 'GoalTarget',
        entityId: string,
        before?: Record<string, unknown>,
        after?: Record<string, unknown>
    ) {
        const userId = await getCurrentUserId();
        if (!userId) return;

        await addDoc(collection(db, 'goal_audit_logs'), {
            actor_user_id: userId,
            action,
            entity,
            entity_id: entityId,
            before_state: before || null,
            after_state: after || null,
            created_at: new Date().toISOString()
        });
    },

     * Create a new DRAFT profile
     */
    async createProfile(profile: Partial<GoalProfile> & { id: string; name: string; description: string }) {
        const insertData = {
            name: profile.name,
            description: profile.description,
            applicable_tests: profile.applicable_tests || [],
            quality_gate: profile.quality_gate || {},
            evidence: profile.evidence || {},
            tags: profile.tags || [],
            status: 'DRAFT' as GoalProfileStatus,
            version: 1,
            published_at: null,
            published_by_user_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'goal_profiles'), insertData);
        const data = { id: docRef.id, ...insertData } as GoalProfile;

        await this.logAudit('CREATE', 'GoalProfile', data.id, null, data);

        return data;
    },

     * Update a DRAFT profile
     */
    async updateProfile(id: string, updates: Partial<GoalProfile>) {
        // Fetch before state for audit
        const beforeDoc = await getDoc(doc(db, 'goal_profiles', id));
        const before = beforeDoc.exists() ? { id: beforeDoc.id, ...beforeDoc.data() } : null;

        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        const docRef = doc(db, 'goal_profiles', id);
        await updateDoc(docRef, updateData);

        // Fetch updated data
        const afterDoc = await getDoc(docRef);
        const data = { id: afterDoc.id, ...afterDoc.data() } as GoalProfile;

        await this.logAudit('UPDATE', 'GoalProfile', id, before as Record<string, unknown> | null, data);

        return data;
    },

     * Replace all targets for a profile (Delete + Insert transaction ideally, but via client we do sequential)
     * Note: For Firestore, we use batched operations for better atomicity
     */
    async replaceTargets(profileId: string, targets: Omit<GoalTarget, 'id' | 'created_at' | 'updated_at'>[]) {
        // Prepare targets with profileId
        const now = new Date().toISOString();
        const targetsToInsert = targets.map(t => ({
            ...t,
            profile_id: profileId,
            created_at: now,
            updated_at: now
        }));

        // 1. Delete existing targets for this profile
        const existingTargetsQuery = query(
            collection(db, 'goal_targets'),
            where('profile_id', '==', profileId)
        );
        const existingTargetsSnapshot = await getDocs(existingTargetsQuery);

        // Use batch for delete+insert (max 500 operations)
        const batch = writeBatch(db);

        // Delete existing
        existingTargetsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Insert new
        const newTargets: GoalTarget[] = [];
        for (const target of targetsToInsert) {
            const newDocRef = doc(collection(db, 'goal_targets'));
            batch.set(newDocRef, target);
            newTargets.push({ id: newDocRef.id, ...target } as GoalTarget);
        }

        await batch.commit();
        return newTargets;
    },

     * Publish a Draft profile via Firebase Function
     */
    async publishProfile(id: string) {
        const functions = getFirebaseFunctions();
        const publishFunction = httpsCallable(functions, 'publishGoalProfile');

        const result = await publishFunction({ profileId: id });
        return result.data;
    }
};
