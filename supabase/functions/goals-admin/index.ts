import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// --- Schemas ---
const TargetSchema = z.object({
    key: z.string(), // TODO: validate against registry whitelist if available
    mode: z.enum(['CUT_OFF', 'IMPROVEMENT_ABS', 'IMPROVEMENT_PCT', 'RANGE', 'CUSTOM']),
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    minDeltaAbs: z.number().nullable().optional(),
    minDeltaPct: z.number().nullable().optional(),
    isOptional: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
    labelOverride: z.string().optional(),
    notes: z.string().optional()
});

const ProfileUpdateSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    applicableTests: z.array(z.string()).optional(),
    qualityGate: z.record(z.unknown()).optional(),
    evidence: z.array(z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
    targets: z.array(TargetSchema).optional() // Full replace strategy for simplicity?
});

// Helper: Log Audit
async function logAudit(action: string, entity: string, entityId: string, actor: any, before: any, after: any) {
    await supabase.from('audit_logs').insert({
        action,
        entity,
        entity_id: entityId,
        actor_id: actor.sub, // User ID from JWT
        actor_email: actor.email,
        before,
        after
    });
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // Auth Guard
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    // Route Dispatch simple
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Robust routing using Regex to handle different path prefixes
    // Matches: .../profiles
    // Matches: .../profiles/:id
    // Matches: .../profiles/:id/publish

    // 1. List or Create Profiles
    const profilesMatch = pathname.match(/\/profiles$/);
    // 2. Get or Update Profile
    const profileIdMatch = pathname.match(/\/profiles\/([^/]+)$/);
    // 3. Publish Profile
    const publishMatch = pathname.match(/\/profiles\/([^/]+)\/publish$/);

    let resource = '';
    let id = '';
    let action = '';

    if (publishMatch) {
        resource = 'profiles';
        id = publishMatch[1];
        action = 'publish';
    } else if (profileIdMatch) {
        // Distinguish between simple ID match and false positives if needed, but here it's simple
        resource = 'profiles';
        id = profileIdMatch[1];
    } else if (profilesMatch) {
        resource = 'profiles';
    }


    try {
        // 1. LIST Profiles
        if (resource === 'profiles' && !id && req.method === 'GET') {
            const { data, error } = await supabase.from('goal_profiles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. GET Profile Detail
        if (resource === 'profiles' && id && !action && req.method === 'GET') {
            const { data: profile, error: pError } = await supabase.from('goal_profiles').select('*').eq('id', id).single();
            if (pError) throw pError;

            const { data: targets, error: tError } = await supabase.from('goal_targets').select('*').eq('profile_id', id).order('sort_order');
            if (tError) throw tError;

            return new Response(JSON.stringify({ ok: true, data: { ...profile, targets } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 3. CREATE Draft Profile (POST /profiles)
        if (resource === 'profiles' && !id && req.method === 'POST') {
            const json = await req.json();
            const { id: newId, name, description } = json;

            const { data, error } = await supabase.from('goal_profiles').insert({
                id: newId, // User provided ID or auto? usually auto if UUID, but user wants readable IDs.
                name,
                description,
                status: 'DRAFT',
                version: 1,
                applicable_tests: [] // Init empty
            }).select().single();

            if (error) throw error;

            await logAudit('CREATE', 'GoalProfile', data.id, user, null, data);
            return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 4. UPDATE Profile (PUT /profiles/:id)
        if (resource === 'profiles' && id && !action && req.method === 'PUT') {
            const json = await req.json();
            const { targets, ...meta } = ProfileUpdateSchema.parse(json);

            // Fetch current for logging
            const { data: before } = await supabase.from('goal_profiles').select('*').eq('id', id).single();

            // Update Meta
            const { data: after, error } = await supabase.from('goal_profiles').update({
                ...meta,
                updated_at: new Date().toISOString()
            }).eq('id', id).select().single();

            if (error) throw error;

            // If Targets provided, replace all
            if (targets) {
                // Fetch old targets for audit? (Maybe too heavy, skip deep diff for now)
                await supabase.from('goal_targets').delete().eq('profile_id', id);

                const newTargets = targets.map((t, i) => ({
                    profile_id: id,
                    key: t.key,
                    mode: t.mode,
                    min: t.min,
                    max: t.max,
                    min_delta_abs: t.minDeltaAbs,
                    min_delta_pct: t.minDeltaPct,
                    is_optional: t.isOptional,
                    is_enabled: t.isEnabled ?? true,
                    sort_order: i,
                    label_override: t.labelOverride,
                    notes: t.notes
                }));

                if (newTargets.length) {
                    await supabase.from('goal_targets').insert(newTargets);
                }
            }

            await logAudit('UPDATE', 'GoalProfile', id, user, before, after);
            return new Response(JSON.stringify({ ok: true, data: after }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 5. PUBLISH Profile (POST /profiles/:id/publish)
        if (resource === 'profiles' && id && action === 'publish' && req.method === 'POST') {
            // Fetch current
            const { data: current } = await supabase.from('goal_profiles').select('*').eq('id', id).single();

            const newVersion = (current.version || 0) + 1;

            const { data: after, error } = await supabase.from('goal_profiles').update({
                status: 'PUBLISHED',
                version: newVersion,
                published_at: new Date().toISOString(),
                published_by: user.id
            }).eq('id', id).select().single();

            if (error) throw error;

            await logAudit('PUBLISH', 'GoalProfile', id, user, current, after);
            return new Response(JSON.stringify({ ok: true, data: after }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (error: any) {
        return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
