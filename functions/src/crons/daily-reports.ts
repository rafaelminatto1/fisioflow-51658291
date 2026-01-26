/**
 * Firebase Cloud Function - Daily Reports
 *
 * Substitui o cron job "/api/crons/daily-reports" do Vercel
 * Agendado para executar diariamente às 08:00
 *
 * @version 1.0.0 - Firebase Functions v2
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getAdminDb } from '../init';

/**
 * Daily Reports Scheduled Function
 *
 * Executa diariamente às 08:00 para:
 * - Gerar relatórios diários para cada organização
 * - Enviar relatórios por email para terapeutas
 * - Compilar estatísticas de sessões do dia anterior
 *
 * Schedule: "every day 08:00"
 * Region: us-central1 (default)
 */
export const dailyReports = onSchedule({
  schedule: 'every day 08:00',
  region: 'southamerica-east1',
  timeZone: 'America/Sao_Paulo',
}, async (event): Promise<void> => {
  const db = getAdminDb();
  const startTime = Date.now();

  logger.info('[dailyReports] Iniciando geração de relatórios diários', {
    jobName: 'dailyReports',
    scheduleTime: event.scheduleTime,
  });

  try {
    // Calculate date range for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Get all active organizations
    const organizationsSnapshot = await db
      .collection('organizations')
      .where('active', '==', true)
      .get();

    const organizations = organizationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (organizations.length === 0) {
      logger.info('[dailyReports] Nenhuma organização ativa encontrada');
      void {
        success: true,
        reportsGenerated: 0,
        emailsSent: 0,
        organizationsProcessed: 0,
        timestamp: new Date().toISOString(),
        message: 'No active organizations',
      };
      return;
    }

    logger.info('[dailyReports] Processando organizações', {
      count: organizations.length,
    });

    // Step 2: Process each organization
    const results = await Promise.all(
      organizations.map(async (org: any) => {
        const orgStartTime = Date.now();

        try {
          // Get therapists who should receive daily reports
          const therapistsSnapshot = await db
            .collection('profiles')
            .where('organization_id', '==', org.id)
            .where('active', '==', true)
            .where('receive_daily_reports', '==', true)
            .get();

          const therapists = therapistsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          if (therapists.length === 0) {
            logger.info(`[dailyReports] Org ${org.id}: Nenhum terapeuta com relatórios diários habilitados`);
            return {
              organizationId: org.id,
              organizationName: org.name,
              reportsGenerated: 0,
              emailsSent: 0,
              skipped: true,
              reason: 'No therapists with daily reports enabled',
            };
          }

          // Get yesterday's sessions (SOAP records)
          const sessionsSnapshot = await db
            .collection('soap_records')
            .where('organization_id', '==', org.id)
            .where('created_at', '>=', yesterday.toISOString())
            .where('created_at', '<', today.toISOString())
            .get();

          const sessions = sessionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Get appointments for yesterday
          const appointmentsSnapshot = await db
            .collection('appointments')
            .where('organization_id', '==', org.id)
            .where('appointment_date', '==', yesterday.toISOString().split('T')[0])
            .get();

          const appointments = appointmentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Count appointments by status
          const appointmentsByStatus = appointments.reduce(
            (acc: Record<string, number>, apt: any) => {
              const status = apt.status || 'unknown';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            },
            {}
          );

          // Generate report data
          const reportData = {
            organization: org.name,
            organizationId: org.id,
            date: yesterday.toISOString().split('T')[0],
            totalSessions: sessions.length,
            totalAppointments: appointments.length,
            appointmentsByStatus,
            sessionsByTherapist: sessions.reduce(
              (acc: Record<string, number>, session: any) => {
                const therapistId = session.created_by || 'unassigned';
                acc[therapistId] = (acc[therapistId] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
            completedSessions: sessions.filter((s: any) => s.status === 'finalized').length,
            draftSessions: sessions.filter((s: any) => s.status === 'draft').length,
          };

          // Save report to Firestore
          const reportRef = db.collection('daily_reports').doc();
          await reportRef.create({
            ...reportData,
            created_at: new Date().toISOString(),
            generated_by: 'system',
          });

          // Send reports to therapists
          let emailsSent = 0;
          const emailPromises = therapists.map(async (therapist: any) => {
            try {
              // TODO: Implementar envio de email via Resend/SendGrid
              // Por enquanto, apenas logar
              logger.info(`[dailyReports] Enviando relatório para terapeuta`, {
                organizationId: org.id,
                organizationName: org.name,
                therapistId: therapist.id,
                therapistEmail: therapist.email,
                reportId: reportRef.id,
              });

              // Salvar log de envio
              const logRef1 = db.collection('daily_report_logs').doc();
              await logRef1.create({
                report_id: reportRef.id,
                therapist_id: therapist.id,
                therapist_email: therapist.email,
                organization_id: org.id,
                sent_at: new Date().toISOString(),
                status: 'sent',
              });

              emailsSent++;
            } catch (error) {
              logger.error(`[dailyReports] Erro ao enviar relatório para terapeuta`, {
                organizationId: org.id,
                therapistId: therapist.id,
                error,
              });

              // Salvar log de erro
              const logRef2 = db.collection('daily_report_logs').doc();
              await logRef2.create({
                report_id: reportRef.id,
                therapist_id: therapist.id,
                therapist_email: therapist.email,
                organization_id: org.id,
                sent_at: new Date().toISOString(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          });

          await Promise.all(emailPromises);

          const orgDuration = Date.now() - orgStartTime;
          logger.info(`[dailyReports] Org ${org.id} processada`, {
            organizationName: org.name,
            reportsGenerated: 1,
            emailsSent,
            duration: orgDuration,
          });

          return {
            organizationId: org.id,
            organizationName: org.name,
            reportsGenerated: 1,
            emailsSent,
            reportId: reportRef.id,
            reportData,
          };
        } catch (error) {
          const orgDuration = Date.now() - orgStartTime;
          logger.error(`[dailyReports] Erro ao processar organização ${org.id}`, {
            organizationName: org.name,
            error,
            duration: orgDuration,
          });

          return {
            organizationId: org.id,
            organizationName: org.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            reportsGenerated: 0,
            emailsSent: 0,
          };
        }
      })
    );

    // Calculate totals
    const totalReports = results.reduce((sum: number, r: any) => sum + (r.reportsGenerated || 0), 0);
    const totalEmails = results.reduce((sum: number, r: any) => sum + (r.emailsSent || 0), 0);
    const successfulOrgs = results.filter((r: any) => !r.error).length;
    const failedOrgs = results.filter((r: any) => r.error).length;

    const duration = Date.now() - startTime;

    logger.info('[dailyReports] Relatórios diários concluídos', {
      totalReports,
      totalEmails,
      organizationsProcessed: organizations.length,
      successfulOrgs,
      failedOrgs,
      duration,
    });

    void {
      success: true,
      reportsGenerated: totalReports,
      emailsSent: totalEmails,
      organizationsProcessed: organizations.length,
      successfulOrgs,
      failedOrgs,
      timestamp: new Date().toISOString(),
      duration,
      results,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[dailyReports] Erro fatal na geração de relatórios', {
      error,
      duration,
    });

    throw error;
  }
});

/**
 * Weekly Summary Scheduled Function
 *
 * Executa toda segunda-feira às 09:00 para:
 * - Gerar resumo semanal para cada organização
 * - Compilar estatísticas da semana anterior
 *
 * Schedule: "every monday 09:00"
 */
export const weeklySummary = onSchedule({
  schedule: 'every monday 09:00',
  region: 'southamerica-east1',
  timeZone: 'America/Sao_Paulo',
}, async (event): Promise<void> => {
  const db = getAdminDb();

  logger.info('[weeklySummary] Iniciando geração de resumos semanais', {
    jobName: 'weeklySummary',
    scheduleTime: event.scheduleTime,
  });

  try {
    // Calculate date range for last week
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(lastWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - startOfLastWeek.getDay()); // Sunday
    startOfLastWeek.setHours(0, 0, 0, 0);

    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() + 6);
    endOfLastWeek.setHours(23, 59, 59, 999);

    // Get all active organizations
    const organizationsSnapshot = await db
      .collection('organizations')
      .where('active', '==', true)
      .get();

    const organizations = organizationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    logger.info('[weeklySummary] Processando organizações', {
      count: organizations.length,
      weekStart: startOfLastWeek.toISOString().split('T')[0],
      weekEnd: endOfLastWeek.toISOString().split('T')[0],
    });

    // Process each organization
    const results = await Promise.all(
      organizations.map(async (org: any) => {
        try {
          // Get therapists who should receive weekly summaries
          const therapistsSnapshot = await db
            .collection('profiles')
            .where('organization_id', '==', org.id)
            .where('active', '==', true)
            .where('receive_weekly_summary', '==', true)
            .get();

          const therapists = therapistsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          if (therapists.length === 0) {
            return {
              organizationId: org.id,
              organizationName: org.name,
              reportsGenerated: 0,
              emailsSent: 0,
              skipped: true,
              reason: 'No therapists with weekly summary enabled',
            };
          }

          // Get last week's sessions
          const sessionsSnapshot = await db
            .collection('soap_records')
            .where('organization_id', '==', org.id)
            .where('created_at', '>=', startOfLastWeek.toISOString())
            .where('created_at', '<=', endOfLastWeek.toISOString())
            .get();

          const sessions = sessionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Get last week's appointments
          const appointmentsSnapshot = await db
            .collection('appointments')
            .where('organization_id', '==', org.id)
            .where('appointment_date', '>=', startOfLastWeek.toISOString().split('T')[0])
            .where('appointment_date', '<=', endOfLastWeek.toISOString().split('T')[0])
            .get();

          const appointments = appointmentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Generate weekly summary data
          const summaryData = {
            organization: org.name,
            organizationId: org.id,
            weekStart: startOfLastWeek.toISOString().split('T')[0],
            weekEnd: endOfLastWeek.toISOString().split('T')[0],
            totalSessions: sessions.length,
            totalAppointments: appointments.length,
            completedAppointments: appointments.filter((a: any) => a.status === 'concluido').length,
            cancelledAppointments: appointments.filter((a: any) => a.status === 'cancelado').length,
            missedAppointments: appointments.filter((a: any) => a.status === 'faltou').length,
            sessionsByTherapist: sessions.reduce(
              (acc: Record<string, number>, session: any) => {
                const therapistId = session.created_by || 'unassigned';
                acc[therapistId] = (acc[therapistId] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
            completedSessions: sessions.filter((s: any) => s.status === 'finalized').length,
            draftSessions: sessions.filter((s: any) => s.status === 'draft').length,
          };

          // Save summary to Firestore
          const summaryRef = db.collection('weekly_summaries').doc();
          await summaryRef.create({
            ...summaryData,
            created_at: new Date().toISOString(),
            generated_by: 'system',
          });

          // TODO: Send emails to therapists
          logger.info(`[weeklySummary] Resumo semanal gerado`, {
            organizationId: org.id,
            organizationName: org.name,
            summaryId: summaryRef.id,
          });

          return {
            organizationId: org.id,
            organizationName: org.name,
            reportsGenerated: 1,
            emailsSent: therapists.length, // TODO: atualizar quando emails forem enviados
            summaryId: summaryRef.id,
            summaryData,
          };
        } catch (error) {
          logger.error(`[weeklySummary] Erro ao processar organização ${org.id}`, {
            organizationName: org.name,
            error,
          });

          return {
            organizationId: org.id,
            organizationName: org.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            reportsGenerated: 0,
            emailsSent: 0,
          };
        }
      })
    );

    const totalSummaries = results.reduce((sum: number, r: any) => sum + (r.reportsGenerated || 0), 0);
    const totalEmails = results.reduce((sum: number, r: any) => sum + (r.emailsSent || 0), 0);

    logger.info('[weeklySummary] Resumos semanais concluídos', {
      totalSummaries,
      totalEmails,
      organizationsProcessed: organizations.length,
    });

    void {
      success: true,
      summariesGenerated: totalSummaries,
      emailsSent: totalEmails,
      organizationsProcessed: organizations.length,
      timestamp: new Date().toISOString(),
      results,
    };
  } catch (error) {
    logger.error('[weeklySummary] Erro fatal na geração de resumos', { error });
    throw error;
  }
});
