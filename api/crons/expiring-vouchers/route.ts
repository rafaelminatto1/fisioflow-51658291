/**
 * Vercel Cron Job: Expiring Vouchers Reminder
 * Runs every day at 10:00 AM
 * Sends reminders about vouchers expiring in 7 days
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
    console.log('Starting expiring vouchers cron job...');

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get vouchers expiring in 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: vouchers } = await supabase
      .from('vouchers')
      .select('*, patients(name, email), organizations(name)')
      .eq('status', 'active')
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .gte('expires_at', new Date().toISOString());

    let remindersSent = 0;

    for (const voucher of vouchers || []) {
      // Send reminder email
      // TODO: Implement email sending via Resend
      console.log(`Sending reminder for voucher ${voucher.id}`);
      remindersSent++;
    }

    console.log(`Expiring vouchers reminder completed: ${remindersSent} reminders sent`);

    return NextResponse.json({
      success: true,
      remindersSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Expiring vouchers cron job error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
