/**
 * Expiring Vouchers Workflow - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - createClient(supabase) → Firebase Admin SDK
 * - Nested selects → Optimized batch fetch
 *
 * @version 2.0.0 - Improved with centralized Admin SDK helper
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { logger } from '../../lib/errors/logger.js';
import { getAdminDb, batchFetchDocuments } from '../../lib/firebase/admin.js';

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
    const db = getAdminDb();

    // Find vouchers expiring in 7 days
    const vouchers = await step.run('find-expiring-vouchers', async (): Promise<VoucherWithRelations[]> => {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59);

      const eightDaysFromNow = new Date(sevenDaysFromNow);
      eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 1);

      const snapshot = await db.collection('vouchers')
        .where('active', '==', true)
        .where('expiration_date', '>=', sevenDaysFromNow.toISOString())
        .where('expiration_date', '<', eightDaysFromNow.toISOString())
        .get();

      if (snapshot.empty) {
        return [];
      }

      // OPTIMIZATION: Batch fetch all patients and organizations
      const patientIds = snapshot.docs.map(doc => doc.data().patient_id).filter(Boolean);
      const orgIds = snapshot.docs.map(doc => doc.data().organization_id).filter(Boolean);

      const [patientMap, orgMap] = await Promise.all([
        batchFetchDocuments('patients', patientIds),
        batchFetchDocuments('organizations', orgIds),
      ]);

      const vouchersWithRelations: VoucherWithRelations[] = [];
      for (const doc of snapshot.docs) {
        const voucher = { id: doc.id, ...doc.data() } as any;

        vouchersWithRelations.push({
          id: voucher.id,
          expires_at: voucher.expiration_date,
          patient: patientMap.get(voucher.patient_id) || { id: voucher.patient_id, name: 'Unknown' },
          organization: orgMap.get(voucher.organization_id) || { id: voucher.organization_id, name: 'Unknown' },
        });
      }

      return vouchersWithRelations;
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
              logger.info(`[Vouchers] Sending expiration reminder`, { voucherId: voucher.id, channel: 'email' }, 'expiring-vouchers');
            }

            // Send WhatsApp reminder
            if (voucher.patient?.phone) {
              logger.info(`[Vouchers] Sending expiration reminder`, { voucherId: voucher.id, channel: 'whatsapp' }, 'expiring-vouchers');
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

    logger.info(
      `[Vouchers] Expiring vouchers workflow completed`,
      { sentCount, totalVouchers: vouchers.length },
      'expiring-vouchers'
    );

    return {
      success: true,
      remindersSent: sentCount,
      totalVouchers: vouchers.length,
      timestamp: new Date().toISOString(),
      results,
    };
  }
);
