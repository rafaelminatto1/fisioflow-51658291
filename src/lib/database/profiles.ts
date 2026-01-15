import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/errors/logger";

/**
 * Ensures a profile and default role exist for a user.
 * This is a defensive utility to recover from cases where the database trigger might have failed.
 */
export const ensureProfile = async (userId: string, email?: string, fullName?: string): Promise<string | null> => {
    try {
        // 1. Check if profile exists
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
            logger.error('Error fetching profile in ensureProfile', fetchError, 'profiles-util');
        }

        let profileId = profile?.id;

        if (!profile) {
            console.log('Profile not found in ensureProfile, creating for:', userId);
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                    user_id: userId,
                    email: email || null,
                    full_name: fullName || (email ? email.split('@')[0] : 'Usuário'),
                    onboarding_completed: false
                })
                .select('id')
                .single();

            if (insertError && insertError.code !== '23505') {
                logger.error('Error inserting profile in ensureProfile', insertError, 'profiles-util');
            }

            if (newProfile) {
                profileId = newProfile.id;
            } else if (insertError?.code === '23505') {
                // Race condition, fetch it again
                const { data: existing } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('user_id', userId)
                    .single();
                profileId = existing?.id;
            }
        }

        // 2. Ensure default role exists in user_roles
        const { data: role, error: roleFetchError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle();

        if (roleFetchError) {
            logger.error('Error fetching role in ensureProfile', roleFetchError, 'profiles-util');
        }

        if (!role) {
            console.log('Role not found in ensureProfile, creating for:', userId);
            const { error: roleInsertError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role: 'paciente'
                });

            if (roleInsertError && roleInsertError.code !== '23505') {
                logger.error('Error inserting role in ensureProfile', roleInsertError, 'profiles-util');
            }
        }

        return profileId || null;
    } catch (err) {
        logger.error('Unexpected error in ensureProfile', err, 'profiles-util');
        return null;
    }
};
