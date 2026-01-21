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
      const { ResendService } = await import('../../lib/email/index.js');

      return await Promise.all(
        vouchers.map(async (voucher: VoucherWithRelations) => {
          try {
            // Send email reminder
            if (voucher.patient?.email) {
              const expirationDate = new Date(voucher.expires_at);
              await ResendService.sendEmail({
                to: voucher.patient.email,
                subject: `Seu voucher expira em 7 dias ⚠️`,
                html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voucher Expirando</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Voucher Expirando</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Olá <strong>${voucher.patient.name}</strong>,</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Seu voucher expira em <strong>7 dias</strong>!</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f5576c; margin-bottom: 20px;">
      <p style="margin: 0 0 10px 0;"><strong>📅 Data de expiração:</strong> ${expirationDate.toLocaleDateString('pt-BR')}</p>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">Não perca seus créditos! Entre em contato para agendar suas sessões.</p>

    <div style="text-align: center; margin-top: 30px;">
      <p style="font-size: 14px; color: #999;">Equipe ${voucher.organization.name || 'FisioFlow'}</p>
    </div>
  </div>
</body>
</html>
                `.trim(),
                tags: {
                  type: 'voucher-expiration',
                  organization: voucher.organization.id,
                },
              });

              logger.info(`Voucher expiration reminder sent to patient`, { voucherId: voucher.id, email: voucher.patient.email }, 'expiring-vouchers');
            }

            // Send WhatsApp reminder (requires Evolution API integration)
            if (voucher.patient?.phone) {
              // WhatsApp integration requires Evolution API setup
              // This is a placeholder for future implementation
              logger.info(`WhatsApp reminder not yet implemented - requires Evolution API`, { voucherId: voucher.id }, 'expiring-vouchers');
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
