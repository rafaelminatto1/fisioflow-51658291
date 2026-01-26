/**
 * Goals Admin Service - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - supabase.auth.getSession() → Firebase Auth currentUser.getIdToken()
 * - Direct fetch() → Firebase Functions httpsCallable()
 */

import { getFirebaseFunctions } from '@/integrations/firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseAuth } from '@/integrations/firebase/app';
import { GoalProfile, GoalTarget } from '@/lib/goals/goalProfiles.seed';

const functions = getFirebaseFunctions();
const auth = getFirebaseAuth();

export interface ProfileListItem {
    id: string;
    name: string;
    description: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    version: number;
    published_at: string | null;
    updated_at: string;
    created_at: string;
}

export interface ProfileDetail extends ProfileListItem {
    applicable_tests: string[];
    quality_gate: unknown;
    evidence: unknown[];
    tags: string[];
    targets: GoalTarget[];
}

/**
 * Helper to get auth token for Firebase Functions
 */
async function getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user.getIdToken();
}

export const goalsAdminService = {
    /**
     * List all goal profiles
     */
    async listProfiles(): Promise<ProfileListItem[]> {
        const token = await getAuthToken();

        const goalsAdminFunction = httpsCallable(functions, 'goals-admin-profiles');
        const { data } = await goalsAdminFunction({
            action: 'list',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        return (data as any)?.data as ProfileListItem[];
    },

    /**
     * Get a specific profile with targets
     */
    async getProfile(id: string): Promise<ProfileDetail> {
        const token = await getAuthToken();

        const goalsAdminFunction = httpsCallable(functions, 'goals-admin-profiles');
        const { data } = await goalsAdminFunction({
            action: 'get',
            profileId: id,
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        return (data as any)?.data as ProfileDetail;
    },

    /**
     * Create a new draft profile
     */
    async createProfile(id: string, name: string, description: string): Promise<GoalProfile> {
        const token = await getAuthToken();

        const goalsAdminFunction = httpsCallable(functions, 'goals-admin-profiles');
        const { data } = await goalsAdminFunction({
            action: 'create',
            profileData: { id, name, description },
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        return (data as any)?.data as GoalProfile;
    },

    /**
     * Update profile metadata and targets
     */
    async updateProfile(id: string, updates: Partial<GoalProfile>): Promise<GoalProfile> {
        const token = await getAuthToken();

        const goalsAdminFunction = httpsCallable(functions, 'goals-admin-profiles');
        const { data } = await goalsAdminFunction({
            action: 'update',
            profileId: id,
            updates,
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        return (data as any)?.data as GoalProfile;
    },

    /**
     * Publish a draft profile
     */
    async publishProfile(id: string): Promise<GoalProfile> {
        const token = await getAuthToken();

        const goalsAdminFunction = httpsCallable(functions, 'goals-admin-publish');
        const { data } = await goalsAdminFunction({
            profileId: id,
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        return (data as any)?.data as GoalProfile;
    },
};
