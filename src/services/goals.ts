import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

// Types matching the DB schema manually for now (until types.ts is regenerated)
export type GoalProfileStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface GoalProfile {
    id: string;
    name: string;
    description: string;
    applicable_tests: string[]; // Stored as array of strings
    quality_gate: any;
    evidence: any;
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

export const GoalService = {
    /**
     * Fetch all profiles, optionally filtered by status.
     */
    async getProfiles(status?: GoalProfileStatus) {
        let query = supabase
            .from('goal_profiles')
            .select('*, targets:goal_targets(*)') // Join targets
            .order('updated_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    /**
     * Fetch a single profile by ID w/ targets
     */
    async getProfileById(id: string) {
        const { data, error } = await supabase
            .from('goal_profiles')
            .select('*, targets:goal_targets(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Internal helper to log audits
     */
    async logAudit(action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'ARCHIVE', entity: 'GoalProfile' | 'GoalTarget', entityId: string, before?: any, after?: any) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('goal_audit_logs').insert({
            actor_user_id: user.id,
            action,
            entity,
            entity_id: entityId,
            before_state: before,
            after_state: after
        });
    },

    /**
     * Create a new DRAFT profile
     */
    async createProfile(profile: Partial<GoalProfile> & { id: string; name: string }) {
        const { data, error } = await supabase
            .from('goal_profiles')
            .insert({
                ...profile,
                status: 'DRAFT',
                version: 1
            })
            .select()
            .single();

        if (error) throw error;

        await this.logAudit('CREATE', 'GoalProfile', data.id, null, data);

        return data;
    },

    /**
     * Update a DRAFT profile
     */
    async updateProfile(id: string, updates: Partial<GoalProfile>) {
        // Fetch before state for audit
        const { data: before } = await supabase.from('goal_profiles').select('*').eq('id', id).single();

        const { data, error } = await supabase
            .from('goal_profiles')
            .update(updates)
            .eq('id', id)
            .eq('status', 'DRAFT') // Safety check
            .select()
            .single();

        if (error) throw error;

        await this.logAudit('UPDATE', 'GoalProfile', id, before, data);

        return data;
    },

    /**
     * Replace all targets for a profile (Delete + Insert transaction ideally, but via client we do sequential)
     * Note: Supabase JS doesn't support explicit transactions widely unless via RPC, but for this Admin feature:
     * 1. Delete all targets for profile
     * 2. Insert new targets
     */
    async replaceTargets(profileId: string, targets: Omit<GoalTarget, 'id' | 'created_at' | 'updated_at'>[]) {
        // Prepare targets with profileId
        const targetsToInsert = targets.map(t => ({
            ...t,
            profile_id: profileId
        }));

        // 1. Delete existing
        const { error: deleteError } = await supabase
            .from('goal_targets')
            .delete()
            .eq('profile_id', profileId);

        if (deleteError) throw deleteError;

        // 2. Insert new
        const { data, error: insertError } = await supabase
            .from('goal_targets')
            .insert(targetsToInsert)
            .select();

        if (insertError) throw insertError;
        return data;
    },

    /**
     * Publish a Draft profile via RPC
     */
    async publishProfile(id: string) {
        const { data, error } = await supabase
            .rpc('publish_goal_profile', { profile_id: id });

        if (error) throw error;
        return data;
    }
};
