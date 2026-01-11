/**
 * Vercel Cron Job: Birthday Messages
 * Runs every day at 9:00 AM
 * Sends birthday wishes to patients
 */

import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 300,
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  return authHeader === `Bearer ${cronSecret}`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!verifyCronSecret(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
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

    return jsonResponse({
      success: true,
      messagesSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Birthday messages cron job error:', error);
    return jsonResponse(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
