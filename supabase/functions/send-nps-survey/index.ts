import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNPSSurveyRequest {
  appointment_id: string;
  patient_id: string;
  therapist_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, 'send-nps-survey');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { appointment_id, patient_id, therapist_id }: SendNPSSurveyRequest = await req.json();

    if (!appointment_id || !patient_id) {
      return new Response(
        JSON.stringify({ error: "appointment_id and patient_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if survey already exists
    const { data: existing } = await supabaseClient
      .from('satisfaction_surveys')
      .select('id')
      .eq('appointment_id', appointment_id)
      .eq('patient_id', patient_id)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Survey already sent for this appointment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create survey record
    const { data: survey, error: surveyError } = await supabaseClient
      .from('satisfaction_surveys')
      .insert({
        organization_id: profile.organization_id,
        patient_id,
        appointment_id,
        therapist_id,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (surveyError) {
      console.error('Error creating survey:', surveyError);
      return new Response(
        JSON.stringify({ error: surveyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get patient info for notification
    const { data: patient } = await supabaseClient
      .from('patients')
      .select('name, phone, email')
      .eq('id', patient_id)
      .single();

    // TODO: Send notification via WhatsApp/Email
    // For now, just return success

    return new Response(
      JSON.stringify({
        success: true,
        survey_id: survey.id,
        message: "NPS survey sent successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

