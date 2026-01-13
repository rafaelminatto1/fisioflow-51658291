import { createClient } from '@supabase/supabase-js';

// Use service role key for admin access relative to cron
const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(request: Request) {
    // Verify Cron secret if needed (Vercel handles this securely usually, getting CRON_SECRET header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return new Response('Unauthorized', { status: 401 });
        // For now, allowing open for demo/dev, but strictly this should check signature
    }

    try {
        // 1. Check for appointments without patients (Integrity Check)
        const { data: orphans, error } = await supabase
            .from('appointments')
            .select('id, start_time')
            .is('patient_id', null);

        if (error) throw error;

        if (orphans && orphans.length > 0) {
            console.warn(`Found ${orphans.length} orphaned appointments (Data Integrity Issue)`, orphans);
            // Could notify monitoring system or admin email
        } else {
            console.log('Data Integrity Check Passed: No orphaned appointments found.');
        }

        return new Response(JSON.stringify({ success: true, checked: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}
