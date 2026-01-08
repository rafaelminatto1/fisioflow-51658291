import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Auth Check
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // 3. Resolve Tenant (Organization)
        // Minimal check: ensure user has a profile. In real app, check permissions.
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();

        if (!profile?.organization_id) {
            return new Response(JSON.stringify({ error: 'No Organization' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        // 4. Construct Orthanc URL
        // Default to localhost for local dev (assuming function runs on host or uses host networking)
        // In Docker, might need http://host.docker.internal:8042
        const ORTHANC_URL = Deno.env.get('ORTHANC_URL') || 'http://localhost:8042';

        // Parse the path from Header (preferred for API) or Request URL (fallback for WADO)
        const url = new URL(req.url);
        const targetPath = req.headers.get('x-dicom-path') || url.searchParams.get('path');

        if (!targetPath) {
            return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // construct destination
        // Ensure we hit the dicom-web root
        const destUrl = `${ORTHANC_URL}/dicom-web/${targetPath}`;

        console.log(`Proxying ${req.method} to ${destUrl}`);

        // 5. Proxy Request
        // We forward the body and method.
        // We allow passing standard DICOMweb headers.
        const proxyHeaders = new Headers();
        // Forward Accept (important for multipart/related)
        if (req.headers.has('Accept')) proxyHeaders.set('Accept', req.headers.get('Accept')!);
        if (req.headers.has('Content-Type')) proxyHeaders.set('Content-Type', req.headers.get('Content-Type')!);

        const fetchOptions: RequestInit = {
            method: req.method,
            headers: proxyHeaders,
        };

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            fetchOptions.body = req.body; // Stream body directly
        }

        const orthancRes = await fetch(destUrl, fetchOptions);

        // 6. Audit Log (Simplified - ideally async)
        // Only log write operations or specific queries to reduce noise
        if (req.method === 'POST' || targetPath.includes('studies')) {
            // Fire and forget audit log
            supabaseClient.rpc('create_audit_log', {
                p_action_type: 'DICOM_ACCESS',
                p_entity_type: 'dicom',
                p_entity_id: null,
                p_details: { path: targetPath, method: req.method, status: orthancRes.status }
            }).then(({ error }) => { if (error) console.error('Audit Log Error:', error) });
        }

        // 7. Stream Response Back
        // Copy headers from Orthanc response
        const resHeaders = new Headers(corsHeaders);
        orthancRes.headers.forEach((val, key) => {
            // Forward content-type (multipart/related, application/dicom+json, etc)
            if (key.toLowerCase() === 'content-type' || key.toLowerCase() === 'content-length' || key.toLowerCase() === 'transfer-encoding') {
                resHeaders.set(key, val);
            }
        });

        return new Response(orthancRes.body, {
            status: orthancRes.status,
            headers: resHeaders,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
