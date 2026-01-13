import { supabase } from "@/integrations/supabase/client";
import { GoalProfile, GoalTarget } from "@/lib/goals/goalProfiles.seed";

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

export const goalsAdminService = {
    /**
     * List all goal profiles
     */
    async listProfiles() {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goals-admin/profiles`,
            {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to list profiles');
        }

        const result = await response.json();
        return result.data as ProfileListItem[];
    },

    /**
     * Get a specific profile with targets
     */
    async getProfile(id: string) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goals-admin/profiles/${id}`,
            {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get profile');
        }

        const result = await response.json();
        return result.data as ProfileDetail;
    },

    /**
     * Create a new draft profile
     */
    async createProfile(id: string, name: string, description: string) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goals-admin/profiles`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, name, description }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create profile');
        }

        const result = await response.json();
        return result.data;
    },

    /**
     * Update profile metadata and targets
     */
    async updateProfile(id: string, updates: Partial<GoalProfile>) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goals-admin/profiles/${id}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update profile');
        }

        const result = await response.json();
        return result.data;
    },

    /**
     * Publish a draft profile
     */
    async publishProfile(id: string) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goals-admin/profiles/${id}/publish`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to publish profile');
        }

        const result = await response.json();
        return result.data;
    },
};
