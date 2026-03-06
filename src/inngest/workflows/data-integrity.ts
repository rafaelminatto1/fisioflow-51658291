/**
 * Data Integrity Workflow - Migrated to Firebase
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { fisioLogger as logger } from '../../lib/errors/logger.js';
import { getAdminDb } from '../../lib/firebase/admin.js';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { ResendService } from '../../lib/email/resend.js';
import {
  countOrphanedAppointments,
  countOrphanedPatientsFromOrganizations,
  getExistingAppointmentIds,
} from './_shared/neon-patients-appointments';

export const dataIntegrityWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-data-integrity',
    name: 'Data Integrity Check',
    retries: retryConfig.database.maxAttempts,
  },
  [
    { event: Events.CRON_DATA_INTEGRITY },
    { cron: '0 */6 * * *' }, // Every 6 hours
  ],
  async ({ step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const db = getAdminDb();

    const issues: string[] = [];

    // Check 1: Appointments without valid patients
    await step.run('check-orphaned-appointments', async (): Promise<number> => {
      const orphanedCount = await countOrphanedAppointments(100);

      if (orphanedCount > 0) {
        issues.push(`Found ${orphanedCount} appointments with invalid patients`);
      }

      return orphanedCount;
    });

    // Check 2: Sessions without valid appointments
    await step.run('check-orphaned-sessions', async () => {
      const snapshot = await db.collection('soap_records')
        .where('appointment_id', '!=', null)
        .limit(100)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const appointmentIds = snapshot.docs.map(doc => normalizeFirestoreData(doc.data()).appointment_id).filter(Boolean);
      const uniqueAppointmentIds = [...new Set(appointmentIds)];
      const existingIds = await getExistingAppointmentIds(uniqueAppointmentIds as string[]);
      let orphanedCount = 0;
      for (const appointmentId of uniqueAppointmentIds) {
        if (existingIds.has(String(appointmentId))) continue;
        const count = snapshot.docs.filter(doc => normalizeFirestoreData(doc.data()).appointment_id === appointmentId).length;
        orphanedCount += count;
      }

      if (orphanedCount > 0) {
        issues.push(`Found ${orphanedCount} sessions with invalid appointments`);
      }

      return orphanedCount;
    });

    // Check 3: Payments without valid appointments
    await step.run('check-orphaned-payments', async () => {
      const snapshot = await db.collection('payments')
        .where('appointment_id', '!=', null)
        .limit(100)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const appointmentIds = snapshot.docs.map(doc => normalizeFirestoreData(doc.data()).appointment_id).filter(Boolean);
      const uniqueAppointmentIds = [...new Set(appointmentIds)];
      const existingIds = await getExistingAppointmentIds(uniqueAppointmentIds as string[]);
      let orphanedCount = 0;
      for (const appointmentId of uniqueAppointmentIds) {
        if (existingIds.has(String(appointmentId))) continue;
        const count = snapshot.docs.filter(doc => normalizeFirestoreData(doc.data()).appointment_id === appointmentId).length;
        orphanedCount += count;
      }

      if (orphanedCount > 0) {
        issues.push(`Found ${orphanedCount} payments with invalid appointments`);
      }

      return orphanedCount;
    });

    // Check 4: Patients with invalid organizations
    await step.run('check-orphaned-patients', async () => {
      const orphanedCount = await countOrphanedPatientsFromOrganizations(100);

      if (orphanedCount > 0) {
        issues.push(`Found ${orphanedCount} patients with invalid organizations`);
      }

      return orphanedCount;
    });

    // Log results
    await step.run('log-integrity-results', async () => {
      if (issues.length > 0) {
        logger.warn('[Data Integrity] Issues found', { issues }, 'data-integrity');
        
        try {
          await ResendService.sendEmail({
            to: 'admin@fisioflow.com.br',
            subject: '⚠️ Alerta de Integridade de Dados - FisioFlow',
            html: `
              <h1>Problemas de Integridade Detectados</h1>
              <p>O check automático de integridade de dados encontrou os seguintes problemas:</p>
              <ul>
                ${issues.map(issue => `<li>${issue}</li>`).join('')}
              </ul>
              <p>Data do check: ${new Date().toLocaleString('pt-BR')}</p>
              <p>Por favor, verifique o console do Firebase para mais detalhes.</p>
            `,
            tags: { type: 'alert', category: 'data-integrity' }
          });
        } catch (emailError) {
          logger.error('Erro ao enviar alerta de integridade para admins', emailError, 'data-integrity');
        }
      } else {
        logger.info('[Data Integrity] Check passed: No issues found', {}, 'data-integrity');
      }

      return {
        issues,
        timestamp: new Date().toISOString(),
      };
    });

    return {
      success: true,
      issuesFound: issues.length,
      issues,
      timestamp: new Date().toISOString(),
    };
  }
);
