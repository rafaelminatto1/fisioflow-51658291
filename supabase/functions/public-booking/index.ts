import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/api-helpers.ts'

const corsHeaders = getCorsHeaders()

interface BookingRequest {
    slug: string;
    date: string; // ISO string
    time: string; // "HH:MM"
    patient: {
        name: string;
        email: string;
        phone: string;
        notes?: string;
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { slug, date, time, patient }: BookingRequest = await req.json()

        // 1. Get Therapist Profile by Slug
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('user_id, organization_id')
            .eq('slug', slug)
            .single()

        if (profileError || !profile) {
            return new Response(
                JSON.stringify({ error: 'Profissional não encontrado' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Find or Create Patient
        let patientId: string | null = null;

        // Check by email
        const { data: existingPatient } = await supabaseClient
            .from('patients')
            .select('id')
            .eq('email', patient.email)
            .maybeSingle()

        if (existingPatient) {
            patientId = existingPatient.id
        } else {
            // Create new patient
            const { data: newPatient, error: createError } = await supabaseClient
                .from('patients')
                .insert({
                    name: patient.name,
                    email: patient.email,
                    phone: patient.phone,
                    organization_id: profile.organization_id,
                    status: 'active', // or 'lead'
                    notes: 'Paciente criado via Agendamento Público'
                })
                .select('id')
                .single()

            if (createError) {
                throw createError
            }
            patientId = newPatient.id
        }

        // 3. Create Appointment
        const startTime = new Date(date)
        const [hours, minutes] = time.split(':')
        startTime.setHours(parseInt(hours), parseInt(minutes))

        const endTime = new Date(startTime)
        endTime.setHours(endTime.getHours() + 1) // Default 1 hour

        const { data: appointment, error: appointmentError } = await supabaseClient
            .from('appointments')
            .insert({
                organization_id: profile.organization_id,
                patient_id: patientId,
                therapist_id: profile.user_id,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'aguardando_confirmacao',
                type: 'Consulta Inicial',
                notes: `Agendamento Público.\nObservações: ${patient.notes || '-'}`
            })
            .select('id')
            .single()

        if (appointmentError) throw appointmentError

        return new Response(
            JSON.stringify({ success: true, original_data: appointment }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
