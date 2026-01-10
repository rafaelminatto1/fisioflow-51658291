/**
 * Vercel Cron Job: Weekly Summary
 * Runs every Monday at 9:00 AM
 * Sends weekly summary reports to therapists
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300;

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting weekly summary cron job...');

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get last week's date range
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Get all therapists
    const { data: therapists } = await supabase
      .from('profiles')
      .select('id, name, email, organization_id')
      .eq('role', 'fisioterapeuta')
      .eq('active', true);

    let summariesSent = 0;

    for (const therapist of therapists || []) {
      // Get sessions from last week
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('therapist_id', therapist.id)
        .gte('created_at', lastWeek.toISOString())
        .lte('created_at', today.toISOString());

      // Get new patients from last week
      const { data: newPatients } = await supabase
        .from('patients')
        .select('*')
        .eq('therapist_id', therapist.id)
        .gte('created_at', lastWeek.toISOString())
        .lte('created_at', today.toISOString());

      // Generate weekly summary
      const summary = {
        totalSessions: sessions?.length || 0,
        newPatients: newPatients?.length || 0,
        therapist: therapist.name,
        period: {
          from: lastWeek.toISOString(),
          to: today.toISOString(),
        },
      };

      // Send email
      // TODO: Implement email sending via Resend
      console.log(`Sending weekly summary to ${therapist.name}`);
      summariesSent++;
    }

    console.log(`Weekly summary completed: ${summariesSent} summaries sent`);

    return NextResponse.json({
      success: true,
      summariesSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Weekly summary cron job error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
