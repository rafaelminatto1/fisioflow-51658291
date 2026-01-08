import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zod Schemas (Aligned with Seed)
const PromCollectedByEnum = z.enum(["PATIENT", "CLINICIAN"]);
const PromSourceEnum = z.enum(["FORM_WEB", "WHATSAPP", "IN_CLINIC_TABLET", "IMPORT"]);

const PromSnapshotSchema = z.object({
    snapshot_id: z.string().min(3),
    patient_id: z.string().min(3),
    session_id: z.string().min(1).optional(),
    captured_at: z.string().datetime(), // ISO
    collected_by: PromCollectedByEnum,
    source: PromSourceEnum,
    instrument_versions: z.record(z.string()).optional(), // Simplified for flexibility
    measures: z.record(z.number().nullable()),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

const BulkBodySchema = z.object({
    items: z.array(PromSnapshotSchema).min(1),
    mode: z.enum(["UPSERT", "CREATE_ONLY"]).optional().default("UPSERT"),
});

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const json = await req.json();
        const parsed = BulkBodySchema.safeParse(json);

        if (!parsed.success) {
            return new Response(
                JSON.stringify({ ok: false, error: "INVALID_BODY", details: parsed.error.flatten() }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { items, mode } = parsed.data;

        // Filter "prom." keys locally?
        const cleanItems = items.map(s => {
            const cleanMeasures: Record<string, number | null> = {};
            for (const [k, v] of Object.entries(s.measures)) {
                if (k.startsWith("prom.")) cleanMeasures[k] = v;
            }
            return { ...s, measures: cleanMeasures };
        });

        let result;

        if (mode === 'CREATE_ONLY') {
            const { data, error } = await supabase
                .from('prom_snapshots')
                .insert(cleanItems)
                .select();

            if (error) throw error;
            result = { inserted: data?.length };
        } else {
            // UPSERT
            const { data, error } = await supabase
                .from('prom_snapshots')
                .upsert(cleanItems, { onConflict: 'snapshot_id' })
                .select();

            if (error) throw error;
            result = { upserted: data?.length };
        }

        return new Response(
            JSON.stringify({ ok: true, ...result }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
