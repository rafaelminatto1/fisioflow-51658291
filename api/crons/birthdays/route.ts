/**
 * Vercel Cron Job: Birthday Messages
 * Runs every day at 9:00 AM
 * Sends birthday wishes to patients
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
    console.log('Starting birthday messages cron job...');

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get today's date in MM-DD format
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayMMDD = `${month}-${day}`;

    // Get patients with birthdays today
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, email, phone, date_of_birth, organization_id')
      .eq('active', true)
      .filter('date_of_birth', 'like', `%-${todayMMDD}`);

    let messagesSent = 0;

    for (const patient of patients || []) {
      // Send birthday message via WhatsApp
      // TODO: Implement WhatsApp sending via Evolution API
      console.log(`Sending birthday message to ${patient.name}`);

      // Get organization settings
      const { data: org } = await supabase
        .from('organizations')
        .select('name, settings')
        .eq('id', patient.organization_id)
        .single();

      messagesSent++;
    }

    console.log(`Birthday messages completed: ${messagesSent} messages sent`);

    return NextResponse.json({
      success: true,
      messagesSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Birthday messages cron job error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
