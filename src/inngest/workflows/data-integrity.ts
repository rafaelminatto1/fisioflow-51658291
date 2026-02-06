/**
 * Data Integrity Workflow - Migrated to Firebase
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { fisioLogger as logger } from '../../lib/errors/logger.js';
import { getAdminDb, documentExists } from '../../lib/firebase/admin.js';
import { normalizeFirestoreData } from '@/utils/firestoreData';

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

    // OPTIMIZATION: Batch validate documents
    const validateRefs = async (collectionPath: string, refField: string, targetCollection: string, limit: number) => {
      const snapshot = await db.collection(collectionPath).limit(limit).get();

      const orphanedIds: string[] = [];
      const refIds = snapshot.docs.map(doc => normalizeFirestoreData(doc.data())[refField]).filter(Boolean);

      // Batch check existence
      for (const refId of refIds) {
        const exists = await documentExists(targetCollection, refId);
        if (!exists) {
          orphanedIds.push(refId);
        }
      }

      return orphanedIds.length;
    };

    // Check 1: Appointments without valid patients
    await step.run('check-orphaned-appointments', async (): Promise<number> => {
      const snapshot = await db.collection('appointments').limit(100).get();

      let orphanedCount = 0;
      const patientIds = snapshot.docs.map(doc => normalizeFirestoreData(doc.data()).patient_id).filter(Boolean);
      const uniquePatientIds = [...new Set(patientIds)];

      // Batch check patients
      for (const patientId of uniquePatientIds) {
        const exists = await documentExists('patients', patientId);
        if (!exists) {
          // Count how many appointments reference this patient
          const count = snapshot.docs.filter(doc => normalizeFirestoreData(doc.data()).patient_id === patientId).length;
          orphanedCount += count;
        }
      }

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

      let orphanedCount = 0;
      for (const appointmentId of uniqueAppointmentIds) {
        const exists = await documentExists('appointments', appointmentId);
        if (!exists) {
          const count = snapshot.docs.filter(doc => normalizeFirestoreData(doc.data()).appointment_id === appointmentId).length;
          orphanedCount += count;
        }
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

      let orphanedCount = 0;
      for (const appointmentId of uniqueAppointmentIds) {
        const exists = await documentExists('appointments', appointmentId);
        if (!exists) {
          const count = snapshot.docs.filter(doc => normalizeFirestoreData(doc.data()).appointment_id === appointmentId).length;
          orphanedCount += count;
        }
      }

      if (orphanedCount > 0) {
        issues.push(`Found ${orphanedCount} payments with invalid appointments`);
      }

      return orphanedCount;
    });

    // Check 4: Patients with invalid organizations
    await step.run('check-orphaned-patients', async () => {
      const snapshot = await db.collection('patients').limit(100).get();

      const orgIds = snapshot.docs.map(doc => normalizeFirestoreData(doc.data()).organization_id).filter(Boolean);
      const uniqueOrgIds = [...new Set(orgIds)];

      let orphanedCount = 0;
      for (const orgId of uniqueOrgIds) {
        const exists = await documentExists('organizations', orgId);
        if (!exists) {
          const count = snapshot.docs.filter(doc => normalizeFirestoreData(doc.data()).organization_id === orgId).length;
          orphanedCount += count;
        }
      }

      if (orphanedCount > 0) {
        issues.push(`Found ${orphanedCount} patients with invalid organizations`);
      }

      return orphanedCount;
    });

    // Log results
    await step.run('log-integrity-results', async () => {
      if (issues.length > 0) {
        logger.warn('[Data Integrity] Issues found', { issues }, 'data-integrity');
        // TODO: Send alert to admins
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