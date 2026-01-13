/**
 * Expiring Vouchers Workflow
 *
 * Migrated from /api/crons/expiring-vouchers
 * Runs daily at 10:00 AM to send reminders for vouchers expiring in 7 days
 */

import { inngest, retryConfig } from '@/lib/inngest/client';
import { Events } from '@/lib/inngest/types';
import { createClient } from '@supabase/supabase-js';

export const expiringVouchersWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-expiring-vouchers',
    name: 'Expiring Vouchers Reminders',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: Events.CRON_EXPIRING_VOUCHERS,
    cron: '0 10 * * *', // 10:00 AM daily
  },
  async ({ step }: { event: { data: Record<string, unknown> }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find vouchers expiring in 7 days
    const vouchers = await step.run('find-expiring-vouchers', async () => {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59);

      const eightDaysFromNow = new Date(sevenDaysFromNow);
      eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 1);

      const { data, error } = await supabase
        .from('vouchers')
        .select('*, patient:patients(id, name, email, phone), organization:organizations(id, name)')
        .eq('active', true)
        .gte('expiration_date', sevenDaysFromNow.toISOString())
        .lt('expiration_date', eightDaysFromNow.toISOString());

      if (error) {
        throw new Error(`Failed to fetch expiring vouchers: ${error.message}`);
      }

      return data || [];
    });

    if (vouchers.length === 0) {
      return {
        success: true,
        remindersSent: 0,
        timestamp: new Date().toISOString(),
        message: 'No expiring vouchers',
      };
    }

    // Send reminders
    const results = await step.run('send-reminders', async () => {
      return await Promise.all(
        vouchers.map(async (voucher: { id: string; expires_at?: string }) => {
          try {
            // Send email reminder
            if (voucher.patient?.email) {
              // TODO: Send via Resend
              console.log(`Sending voucher expiration reminder to ${voucher.patient.email}`);
            }

            // Send WhatsApp reminder
            if (voucher.patient?.phone) {
              // TODO: Send via Evolution API
              console.log(`Sending WhatsApp reminder to ${voucher.patient.phone}`);
            }

            return {
              voucherId: voucher.id,
              patientId: voucher.patient.id,
              sent: true,
            };
          } catch (error) {
            return {
              voucherId: voucher.id,
              patientId: voucher.patient.id,
              sent: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );
    });

    const sentCount = results.filter((r: { sent?: boolean }) => r.sent).length;

    return {
      success: true,
      remindersSent: sentCount,
      totalVouchers: vouchers.length,
      timestamp: new Date().toISOString(),
      results,
    };
  }
);
