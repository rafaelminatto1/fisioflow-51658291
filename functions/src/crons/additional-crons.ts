/**
 * Firebase Cloud Functions - Cron Jobs Adicionais
 *
 * Substitui os cron jobs do Vercel:
 * - /api/crons/expiring-vouchers → expiringVouchers
 * - /api/crons/birthdays → birthdays
 * - /api/crons/cleanup → cleanup
 * - /api/crons/data-integrity → dataIntegrity
 *
 * @version 1.0.0 - Firebase Functions v2
 */


// ============================================================================
// EXPIRING VOUCHERS
// ============================================================================

/**
 * Expiring Vouchers Scheduled Function
 *
 * Executa diariamente às 10:00 para:
 * - Enviar lembretes de vouchers que expiram em 7 dias
 * - Notificar pacientes por email e WhatsApp
 *
 * Schedule: "every day 10:00"
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getAdminDb, deleteByQuery } from '../init';
import { FieldPath } from 'firebase-admin/firestore';
import { sendVoucherExpiringEmail, sendBirthdayEmail } from '../communications/resend-templates';

export const expiringVouchers = onSchedule({
  schedule: 'every day 10:00',
  region: 'southamerica-east1',
  timeZone: 'America/Sao_Paulo',
}, async (event): Promise<void> => {
  const db = getAdminDb();

  logger.info('[expiringVouchers] Iniciando verificação de vouchers expirando', {
    jobName: 'expiringVouchers',
    scheduleTime: event.scheduleTime,
  });

  try {
    // Find vouchers expiring in 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59);

    const eightDaysFromNow = new Date(sevenDaysFromNow);
    eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 1);

    const vouchersSnapshot = await db
      .collection('vouchers')
      .where('active', '==', true)
      .where('expiration_date', '>=', sevenDaysFromNow.toISOString())
      .where('expiration_date', '<', eightDaysFromNow.toISOString())
      .get();

    if (vouchersSnapshot.empty) {
      logger.info('[expiringVouchers] Nenhum voucher expirando em 7 dias');
      void {
        success: true,
        remindersSent: 0,
        timestamp: new Date().toISOString(),
        message: 'No expiring vouchers',
      };
      return;
    }

    logger.info('[expiringVouchers] Vouchers encontrados', {
      count: vouchersSnapshot.docs.length,
    });

    // Batch fetch patients and organizations
    const patientIds = vouchersSnapshot.docs
      .map(doc => doc.data().patient_id)
      .filter(Boolean);
    const orgIds = vouchersSnapshot.docs
      .map(doc => doc.data().organization_id)
      .filter(Boolean);

    const [patientsMap, orgsMap] = await Promise.all([
      fetchDocumentsMap('patients', patientIds),
      fetchDocumentsMap('organizations', orgIds),
    ]);

    // Send reminders
    let remindersSent = 0;
    const results = await Promise.all(
      vouchersSnapshot.docs.map(async (doc) => {
        const voucher = { id: doc.id, ...doc.data() } as any;
        const patient = patientsMap.get(voucher.patient_id) || {
          id: voucher.patient_id,
          name: 'Unknown',
        };
        const organization = orgsMap.get(voucher.organization_id) || {
          id: voucher.organization_id,
          name: 'Unknown',
        };

        try {
          // Send email reminder
          if (patient.email) {
            const emailResult = await sendVoucherExpiringEmail(patient.email, {
              customerName: patient.name || 'Paciente',
              voucherName: voucher.name || 'Voucher',
              sessionsRemaining: voucher.sessions_remaining || 0,
              expirationDate: voucher.expiration_date || sevenDaysFromNow.toISOString(),
              daysUntilExpiration: 7,
              organizationName: organization.name || 'FisioFlow',
            });

            logger.info('[expiringVouchers] Email reminder sent', {
              voucherId: voucher.id,
              patientId: patient.id,
              patientEmail: patient.email,
              success: emailResult.success,
              error: emailResult.error,
            });
          }

          // TODO: Send WhatsApp reminder
          if (patient.phone) {
            logger.info('[expiringVouchers] Enviando lembrete por WhatsApp', {
              voucherId: voucher.id,
              patientId: patient.id,
              patientPhone: patient.phone,
            });
          }

          // Log reminder sent
          const reminderRef = db.collection('voucher_reminders').doc();
          await reminderRef.create({
            voucher_id: voucher.id,
            patient_id: patient.id,
            organization_id: organization.id,
            reminder_type: 'expiring_soon',
            sent_at: new Date().toISOString(),
            channels: {
              email: !!patient.email,
              whatsapp: !!patient.phone,
            },
          });

          remindersSent++;
          void {
            voucherId: voucher.id,
            patientId: patient.id,
            sent: true,
          };
          return;
        } catch (error) {
          logger.error('[expiringVouchers] Erro ao enviar lembrete', {
            voucherId: voucher.id,
            patientId: patient.id,
            error,
          });
          void {
            voucherId: voucher.id,
            patientId: patient.id,
            sent: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          return;
        }
      })
    );

    logger.info('[expiringVouchers] Concluído', {
      remindersSent,
      totalVouchers: vouchersSnapshot.docs.length,
    });

    void {
      success: true,
      remindersSent,
      totalVouchers: vouchersSnapshot.docs.length,
      timestamp: new Date().toISOString(),
      results,
    };
  } catch (error) {
    logger.error('[expiringVouchers] Erro fatal', { error });
    throw error;
  }
});

// Helper function to fetch documents and return a map
async function fetchDocumentsMap(
  collectionPath: string,
  ids: string[]
): Promise<Map<string, any>> {
  const db = getAdminDb();
  const map = new Map();

  if (ids.length === 0) return map;

  // Batch fetch - get documents in batches of 30 (Firestore limit)
  const batchSize = 30;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const snapshot = await db
      .collection(collectionPath)
      .where(FieldPath.documentId(), 'in', batch)
      .get();

    snapshot.docs.forEach(doc => {
      map.set(doc.id, { id: doc.id, ...doc.data() });
    });
  }

  return map;
}

// ============================================================================
// BIRTHDAY MESSAGES
// ============================================================================

/**
 * Birthday Messages Scheduled Function
 *
 * Executa diariamente às 09:00 para:
 * - Enviar mensagens de aniversário para pacientes
 * - Enviar via WhatsApp ou Email conforme preferência
 *
 * Schedule: "every day 09:00"
 */
export const birthdays = onSchedule({
  schedule: 'every day 09:00',
  region: 'southamerica-east1',
  timeZone: 'America/Sao_Paulo',
}, async (event): Promise<void> => {
  const db = getAdminDb();

  logger.info('[birthdays] Iniciando verificação de aniversariantes', {
    jobName: 'birthdays',
    scheduleTime: event.scheduleTime,
  });

  try {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayMMDD = `${month}-${day}`;

    // Try to use optimized field first
    const optimizedSnapshot = await db
      .collection('patients')
      .where('active', '==', true)
      .where('birthday_MMDD', '==', todayMMDD)
      .limit(1)
      .get();

    let birthdayPatients: any[] = [];

    if (!optimizedSnapshot.empty) {
      // Field exists, use it for all patients
      const fullSnapshot = await db
        .collection('patients')
        .where('active', '==', true)
        .where('birthday_MMDD', '==', todayMMDD)
        .get();

      birthdayPatients = fullSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      // Fall back to client-side filtering
      logger.warn('[birthdays] Campo birthday_MMDD não encontrado, usando filtro client-side');

      const snapshot = await db
        .collection('patients')
        .where('active', '==', true)
        .select('id', 'name', 'email', 'phone', 'date_of_birth', 'organization_id', 'settings', 'notification_preferences')
        .get();

      birthdayPatients = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((patient: any) => {
          const dob = patient.date_of_birth;
          return dob && dob.includes(`-${todayMMDD}`);
        });
    }

    if (birthdayPatients.length === 0) {
      logger.info('[birthdays] Nenhum aniversário hoje');
      void {
        success: true,
        messagesSent: 0,
        timestamp: new Date().toISOString(),
        message: 'No birthdays today',
      };
      return;
    }

    logger.info('[birthdays] Pacientes com aniversário hoje', {
      count: birthdayPatients.length,
    });

    // Get organization settings and therapists
    const orgIds = [
      ...new Set(birthdayPatients.map((p: any) => p.organization_id).filter(Boolean)),
    ];

    const orgsMap = await fetchDocumentsMap('organizations', orgIds);

    // Fetch all therapists for these organizations
    const therapistsSnapshot = await db
      .collection('profiles')
      .where('organization_id', 'in', orgIds)
      .where('role', '==', 'therapist')
      .get();

    const therapistByOrg = new Map<string, any>();
    therapistsSnapshot.docs.forEach(doc => {
      const therapist = { id: doc.id, ...doc.data() } as any;
      therapistByOrg.set(therapist.organization_id, therapist);
    });

    // Process each birthday patient
    let messagesQueued = 0;
    const results = await Promise.all(
      birthdayPatients.map(async (patient: any) => {
        const org = orgsMap.get(patient.organization_id);
        const preferredChannel =
          patient.settings?.notification_channel ||
          patient.notification_preferences?.preferred_channel ||
          'whatsapp';
        const notifPrefs = patient.notification_preferences || {};
        const whatsappEnabled =
          (org?.settings?.whatsapp_enabled ?? true) && notifPrefs.whatsapp !== false;
        const emailEnabled =
          (org?.settings?.email_enabled ?? true) && notifPrefs.email !== false;

        const therapist = therapistByOrg.get(patient.organization_id);

        try {
          // Send WhatsApp message
          if (whatsappEnabled && preferredChannel === 'whatsapp' && patient.phone) {
            logger.info('[birthdays] Enviando mensagem WhatsApp', {
              patientId: patient.id,
              patientPhone: patient.phone,
            });
            messagesQueued++;
          }

          // Send birthday email
          if (emailEnabled && patient.email) {
            const emailResult = await sendBirthdayEmail(patient.email, {
              patientName: patient.name || 'Paciente',
              therapistName: therapist?.displayName || therapist?.name || 'Equipe FisioFlow',
              clinicName: org?.name || 'FisioFlow',
            });

            logger.info('[birthdays] Birthday email sent', {
              patientId: patient.id,
              patientEmail: patient.email,
              success: emailResult.success,
              error: emailResult.error,
            });

            if (emailResult.success) {
              messagesQueued++;
            }
          }

          // Log birthday greeting sent
          const greetingRef = db.collection('birthday_greetings').doc();
          await greetingRef.create({
            patient_id: patient.id,
            organization_id: org?.id,
            therapist_id: therapist?.id,
            sent_at: new Date().toISOString(),
            channels: {
              whatsapp: whatsappEnabled && preferredChannel === 'whatsapp' && !!patient.phone,
              email: emailEnabled && !!patient.email,
            },
          });

          void {
            patientId: patient.id,
            sent: true,
            channels: {
              whatsapp: whatsappEnabled && preferredChannel === 'whatsapp' && !!patient.phone,
              email: emailEnabled && !!patient.email,
            },
          };
          return;
        } catch (error) {
          logger.error('[birthdays] Erro ao processar aniversário', {
            patientId: patient.id,
            error,
          });
          void {
            patientId: patient.id,
            sent: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          return;
        }
      })
    );

    logger.info('[birthdays] Concluído', {
      messagesQueued,
      totalPatients: birthdayPatients.length,
    });

    void {
      success: true,
      messagesQueued,
      totalPatients: birthdayPatients.length,
      timestamp: new Date().toISOString(),
      results,
    };
  } catch (error) {
    logger.error('[birthdays] Erro fatal', { error });
    throw error;
  }
});

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Cleanup Scheduled Function
 *
 * Executa diariamente às 03:00 (madrugada) para:
 * - Limpar logs de notificação antigos (>90 dias)
 * - Limpar tokens de reset de senha expirados (>24h)
 * - Limpar logs de saúde do sistema (>30 dias)
 * - Limpar sessões incompletas (>7 dias)
 * - Expirar ofertas da lista de espera
 *
 * Schedule: "every day 03:00"
 */
export const cleanup = onSchedule({
  schedule: 'every day 03:00',
  region: 'southamerica-east1',
  timeZone: 'America/Sao_Paulo',
}, async (event): Promise<void> => {
  const db = getAdminDb();

  logger.info('[cleanup] Iniciando limpeza de dados', {
    jobName: 'cleanup',
    scheduleTime: event.scheduleTime,
  });

  try {
    const result: Record<string, number> = {};
    const errors: string[] = [];

    // 1. Clean up old notification logs (older than 90 days)
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      result.notificationHistory = await deleteByQuery(
        'notification_history',
        'created_at',
        '<',
        ninetyDaysAgo.toISOString(),
        { maxDeletes: 10000 }
      );
      logger.info('[cleanup] Logs de notificação limpos', {
        count: result.notificationHistory,
      });
    } catch (error) {
      const errorMsg = `Notificação cleanup: ${error instanceof Error ? error.message : 'Unknown'}`;
      errors.push(errorMsg);
      result.notificationHistory = 0;
    }

    // 2. Clean up expired password reset tokens (older than 24 hours)
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      result.passwordResetTokens = await deleteByQuery(
        'password_reset_tokens',
        'created_at',
        '<',
        twentyFourHoursAgo.toISOString(),
        { maxDeletes: 5000 }
      );
      logger.info('[cleanup] Tokens de senha limpos', {
        count: result.passwordResetTokens,
      });
    } catch (error) {
      const errorMsg = `Password tokens cleanup: ${error instanceof Error ? error.message : 'Unknown'}`;
      errors.push(errorMsg);
      result.passwordResetTokens = 0;
    }

    // 3. Clean up old system health logs (older than 30 days)
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      result.systemHealthLogs = await deleteByQuery(
        'system_health_logs',
        'created_at',
        '<',
        thirtyDaysAgo.toISOString(),
        { maxDeletes: 5000 }
      );
      logger.info('[cleanup] Logs de saúde limpos', {
        count: result.systemHealthLogs,
      });
    } catch (error) {
      const errorMsg = `Health logs cleanup: ${error instanceof Error ? error.message : 'Unknown'}`;
      errors.push(errorMsg);
      result.systemHealthLogs = 0;
    }

    // 4. Clean up incomplete sessions (older than 7 days)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const snapshot = await db
        .collection('soap_records')
        .where('status', '==', 'in_progress')
        .where('updated_at', '<', sevenDaysAgo.toISOString())
        .limit(500)
        .get();

      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      result.incompleteSessions = snapshot.docs.length;
      logger.info('[cleanup] Sessões incompletas limpas', {
        count: result.incompleteSessions,
      });
    } catch (error) {
      const errorMsg = `Sessions cleanup: ${error instanceof Error ? error.message : 'Unknown'}`;
      errors.push(errorMsg);
      result.incompleteSessions = 0;
    }

    // 5. Expire stale waitlist offers
    try {
      const now = new Date().toISOString();

      const snapshot = await db
        .collection('waitlist')
        .where('status', '==', 'offered')
        .where('offer_expires_at', '<', now)
        .limit(500)
        .get();

      if (!snapshot.empty) {
        const batch = db.batch();
        let processedCount = 0;

        snapshot.docs.forEach((docSnap) => {
          const offer = docSnap.data();
          const newRefusalCount = (offer.refusal_count || 0) + 1;
          const newStatus = newRefusalCount >= 3 ? 'removed' : 'waiting';

          batch.update(docSnap.ref, {
            status: newStatus,
            offered_slot: null,
            offered_at: null,
            offer_expires_at: null,
            refusal_count: newRefusalCount,
          });
          processedCount++;
        });

        await batch.commit();
      }

      result.expiredWaitlistOffers = snapshot.docs.length;
      logger.info('[cleanup] Ofertas da lista de espera expiradas', {
        count: result.expiredWaitlistOffers,
      });
    } catch (error) {
      const errorMsg = `Expired offers: ${error instanceof Error ? error.message : 'Unknown'}`;
      errors.push(errorMsg);
      result.expiredWaitlistOffers = 0;
    }

    if (errors.length > 0) {
      logger.warn('[cleanup] Erros durante limpeza', { errors });
    }

    logger.info('[cleanup] Limpeza concluída', { result });

    void {
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    logger.error('[cleanup] Erro fatal', { error });
    throw error;
  }
});

// ============================================================================
// DATA INTEGRITY
// ============================================================================

/**
 * Data Integrity Scheduled Function
 *
 * Executa a cada 6 horas para:
 * - Verificar agendamentos órfãos (sem paciente válido)
 * - Verificar sessões órfãs (sem agendamento válido)
 * - Verificar pagamentos órfãos (sem agendamento válido)
 * - Verificar pacientes com organizações inválidas
 *
 * Schedule: "every 6 hours"
 */
export const dataIntegrity = onSchedule({
  schedule: 'every 6 hours',
  region: 'southamerica-east1',
  timeZone: 'America/Sao_Paulo',
}, async (event): Promise<void> => {
  const db = getAdminDb();

  logger.info('[dataIntegrity] Iniciando verificação de integridade', {
    jobName: 'dataIntegrity',
    scheduleTime: event.scheduleTime,
  });

  try {
    const issues: string[] = [];

    // 1. Check orphaned appointments
    const appointmentsSnapshot = await db
      .collection('appointments')
      .limit(100)
      .get();

    let orphanedAppointmentsCount = 0;
    const patientIds = appointmentsSnapshot.docs
      .map(doc => doc.data().patient_id)
      .filter(Boolean);
    const uniquePatientIds = [...new Set(patientIds)];

    for (const patientId of uniquePatientIds) {
      const patientRef = await db.collection('patients').doc(patientId).get();
      if (!patientRef.exists) {
        const count = appointmentsSnapshot.docs.filter(
          doc => doc.data().patient_id === patientId
        ).length;
        orphanedAppointmentsCount += count;
      }
    }

    if (orphanedAppointmentsCount > 0) {
      issues.push(
        `${orphanedAppointmentsCount} agendamentos com pacientes inválidos`
      );
    }

    // 2. Check orphaned sessions
    const sessionsSnapshot = await db
      .collection('soap_records')
      .where('appointment_id', '!=', null)
      .limit(100)
      .get();

    let orphanedSessionsCount = 0;
    if (!sessionsSnapshot.empty) {
      const appointmentIds = sessionsSnapshot.docs
        .map(doc => doc.data().appointment_id)
        .filter(Boolean);
      const uniqueAppointmentIds = [...new Set(appointmentIds)];

      for (const appointmentId of uniqueAppointmentIds) {
        const appointmentRef = await db
          .collection('appointments')
          .doc(appointmentId)
          .get();
        if (!appointmentRef.exists) {
          const count = sessionsSnapshot.docs.filter(
            doc => doc.data().appointment_id === appointmentId
          ).length;
          orphanedSessionsCount += count;
        }
      }
    }

    if (orphanedSessionsCount > 0) {
      issues.push(
        `${orphanedSessionsCount} sessões com agendamentos inválidos`
      );
    }

    // 3. Check orphaned payments
    const paymentsSnapshot = await db
      .collection('payments')
      .where('appointment_id', '!=', null)
      .limit(100)
      .get();

    let orphanedPaymentsCount = 0;
    if (!paymentsSnapshot.empty) {
      const appointmentIds = paymentsSnapshot.docs
        .map(doc => doc.data().appointment_id)
        .filter(Boolean);
      const uniqueAppointmentIds = [...new Set(appointmentIds)];

      for (const appointmentId of uniqueAppointmentIds) {
        const appointmentRef = await db
          .collection('appointments')
          .doc(appointmentId)
          .get();
        if (!appointmentRef.exists) {
          const count = paymentsSnapshot.docs.filter(
            doc => doc.data().appointment_id === appointmentId
          ).length;
          orphanedPaymentsCount += count;
        }
      }
    }

    if (orphanedPaymentsCount > 0) {
      issues.push(
        `${orphanedPaymentsCount} pagamentos com agendamentos inválidos`
      );
    }

    // 4. Check patients with invalid organizations
    const patientsSnapshot = await db
      .collection('patients')
      .limit(100)
      .get();

    let orphanedPatientsCount = 0;
    const orgIds = patientsSnapshot.docs
      .map(doc => doc.data().organization_id)
      .filter(Boolean);
    const uniqueOrgIds = [...new Set(orgIds)];

    for (const orgId of uniqueOrgIds) {
      const orgRef = await db.collection('organizations').doc(orgId).get();
      if (!orgRef.exists) {
        const count = patientsSnapshot.docs.filter(
          doc => doc.data().organization_id === orgId
        ).length;
        orphanedPatientsCount += count;
      }
    }

    if (orphanedPatientsCount > 0) {
      issues.push(
        `${orphanedPatientsCount} pacientes com organizações inválidas`
      );
    }

    // Log results
    if (issues.length > 0) {
      logger.warn('[dataIntegrity] Problemas encontrados', {
        issues,
        count: issues.length,
      });
      // TODO: Send alert to admins
    } else {
      logger.info('[dataIntegrity] Verificação concluída: Sem problemas');
    }

    void {
      success: true,
      issuesFound: issues.length,
      issues,
      orphanedAppointments: orphanedAppointmentsCount,
      orphanedSessions: orphanedSessionsCount,
      orphanedPayments: orphanedPaymentsCount,
      orphanedPatients: orphanedPatientsCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('[dataIntegrity] Erro fatal', { error });
    throw error;
  }
});
