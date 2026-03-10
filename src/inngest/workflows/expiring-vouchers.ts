/**
 * Expiring Vouchers Workflow - Migrated to Neon
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { fisioLogger as logger } from '../../lib/errors/logger.js';
import { getExpiringVouchers } from './_shared/neon-patients-appointments';

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
    // Find vouchers expiring in 7 days (Neon)
    const vouchers = await step.run('find-expiring-vouchers', async () => {
      return await getExpiringVouchers(7);
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
      const events: any[] = [];
      
      for (const voucher of vouchers) {
        if (voucher.patient_phone) {
          events.push({
            name: 'whatsapp/send',
            data: {
              to: voucher.patient_phone,
              message: `Olá ${voucher.patient_name}, seu voucher na clínica ${voucher.organization_name} expira em 7 dias! Aproveite para agendar sua próxima sessão.`
            }
          });
        }
      }

      if (events.length > 0) {
        await inngest.send(events);
      }

      return { sentCount: events.length };
    });

    return {
      success: true,
      remindersSent: results.sentCount,
      totalVouchers: vouchers.length,
      timestamp: new Date().toISOString(),
    };
  }
);
