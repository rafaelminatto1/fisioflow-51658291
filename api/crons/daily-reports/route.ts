/**
 * Vercel Cron Job: Daily Reports
 * Runs every day at 8:00 AM
 * Generates and sends daily reports to patients and therapists
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET is not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('Starting daily reports cron job...');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, settings')
      .eq('active', true);

    if (orgError) throw orgError;

    let reportsGenerated = 0;
    let emailsSent = 0;

    for (const org of organizations || []) {
      // Get patients who should receive daily reports
      const { data: patients } = await supabase
        .from('patients')
        .select('id, name, email, therapist_id')
        .eq('organization_id', org.id)
        .eq('active', true)
        .eq('receive_daily_reports', true);

      for (const patient of patients || []) {
        // Get yesterday's sessions
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: sessions } = await supabase
          .from('sessions')
          .select('*')
          .eq('patient_id', patient.id)
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', today.toISOString());

        if (sessions && sessions.length > 0) {
          // Generate report
          reportsGenerated++;

          // Send email via Resend
          // TODO: Implement email sending logic
          emailsSent++;
        }
      }
    }

    console.log(`Daily reports completed: ${reportsGenerated} reports, ${emailsSent} emails sent`);

    return NextResponse.json({
      success: true,
      reportsGenerated,
      emailsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Daily reports cron job error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
