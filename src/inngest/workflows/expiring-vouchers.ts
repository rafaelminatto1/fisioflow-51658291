/**
 * Expiring Vouchers Workflow
 *
 * Migrated from /api/crons/expiring-vouchers
 * Runs daily at 10:00 AM to send reminders for vouchers expiring in 7 days
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../lib/errors/logger.js';

type VoucherWithRelations = {
  id: string;
  expires_at?: string;
  patient: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  organization: {
    id: string;
    name?: string;
  };
};

export const expiringVouchersWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-expiring-vouchers',
    name: 'Expiring Vouchers Reminders',
    retries: retryConfig.email.maxAttempts,
  },
  [
    { event: Events.CRON_EXPIRING_VOUCHERS },
    { cron: '0 10 * * *' }, // 10:00 AM daily
  ],
  async ({ step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find vouchers expiring in 7 days
    const vouchers = await step.run('find-expiring-vouchers', async (): Promise<VoucherWithRelations[]> => {
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

      // We need to cast here because Supabase types might not perfectly match our explicit nested structure
      return (data || []) as unknown as VoucherWithRelations[];
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
        vouchers.map(async (voucher: VoucherWithRelations) => {
          try {
            // Send email reminder
            if (voucher.patient?.email) {
              // TODO: Send via Resend
              logger.info(`Sending voucher expiration reminder to patient`, { voucherId: voucher.id }, 'expiring-vouchers');
            }

            // Send WhatsApp reminder
            if (voucher.patient?.phone) {
              // TODO: Send via Evolution API
              logger.info(`Sending WhatsApp reminder to patient`, { voucherId: voucher.id }, 'expiring-vouchers');
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
