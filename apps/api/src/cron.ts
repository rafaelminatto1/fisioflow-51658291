import { Env } from './types/env';
import { createPool } from './lib/db';
import { triggerInngestEvent } from './lib/inngest-client';
import { sendAppointmentReminderEmail } from './lib/email';
import type { WhatsAppQueuePayload } from './queue';

/**
 * Cloudflare Worker Cron Trigger Handler
 */
export async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const pool = createPool(env);
  const cron = event.cron;

  console.log(`[Cron] Executing job: ${cron} at ${new Date().toISOString()}`);

  try {
    const now = new Date();
    const day = now.getUTCDay(); // 0-6 (Sunday is 0)
    const hour = now.getUTCHours() - 3; // Ajuste para Horário de Brasília (BRT)

    // Business Hours check: Monday to Friday, 7 AM to 8 PM (20h)
    const isBusinessHours = day >= 1 && day <= 5 && hour >= 7 && hour < 20;

    switch (cron) {
      case "0 9 * * *": // UTC 09h = BRT 06h — Lembretes + prewarm pós cold-start
        await prewarmDatabase(pool);
        await sendAppointmentReminders(pool, env, ctx);
        await processBirthdays(pool, env, ctx);
        await processInactivePatients(pool, env, ctx);
        break;

      case "0 11 * * *": // UTC 11h = BRT 08h — Manutenção em horário de expediente
        await performDatabaseCleanup(pool, env);
        break;

      default:
        console.warn(`[Cron] No handler defined for schedule: ${cron}`);
    }
  } catch (error) {
    console.error(`[Cron] Error executing job ${cron}:`, error);
  }
}

async function processBirthdays(db: any, env: Env, ctx: ExecutionContext) {
  console.log('[Cron] Checking for birthdays...');
  const result = await db.query(`
    SELECT id, full_name, phone 
    FROM patients 
    WHERE is_active = true 
      AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
  `);

  for (const row of result.rows) {
    await triggerInngestEvent(env, ctx, 'patient.birthday', {
      patientId: row.id,
      name: row.full_name,
      phone: row.phone
    });
  }
}

async function processInactivePatients(db: any, env: Env, ctx: ExecutionContext) {
  console.log('[Cron] Checking for inactive patients...');
  const result = await db.query(`
    SELECT p.id, p.full_name, p.phone, p.organization_id
    FROM patients p
    WHERE p.is_active = true
      AND p.organization_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.patient_id = p.id
          AND a.organization_id = p.organization_id
          AND a.date >= (CURRENT_DATE - INTERVAL '15 days')
      )
  `);

  for (const row of result.rows) {
    await triggerInngestEvent(env, ctx, 'patient.inactive', {
      patientId: row.id,
      name: row.full_name,
      phone: row.phone
    });
  }
}

async function sendAppointmentReminders(pool: any, env: Env, _ctx: ExecutionContext) {
  console.log('[Cron] Sending appointment reminders (Email & WhatsApp)...');
  const result = await pool.query(`
    SELECT
      a.id,
      a.organization_id,
      a.patient_id,
      a.start_time::text AS time,
      TO_CHAR(a.date, 'DD/MM/YYYY') AS formatted_date,
      p.full_name AS patient_name,
      p.email AS patient_email,
      p.phone AS patient_phone,
      prof.full_name AS therapist_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN profiles prof ON prof.user_id = a.therapist_id
    WHERE a.date = CURRENT_DATE + INTERVAL '1 day'
      AND a.status NOT IN ('cancelled', 'no_show')
  `);

  let emailSent = 0;
  let whatsappSent = 0;

  for (const row of result.rows) {
    // 1. Email Reminder
    if (row.patient_email) {
      try {
        await sendAppointmentReminderEmail(env, row.patient_email, {
          patientName: row.patient_name,
          date: row.formatted_date,
          time: row.time?.substring(0, 5) ?? '',
          therapistName: row.therapist_name,
        });
        emailSent++;
      } catch (err) {
        console.error(`[Cron] Failed to send email to ${row.patient_email}:`, err);
      }
    }

    // 2. WhatsApp Reminder — enqueue for async processing with automatic retry
    if (row.patient_phone && env.BACKGROUND_QUEUE) {
      try {
        const timeStr = row.time?.substring(0, 5) ?? '';
        const therapistStr = row.therapist_name || 'Fisioterapeuta';
        const queuePayload: WhatsAppQueuePayload = {
          to: row.patient_phone,
          templateName: 'lembrete_sessao',
          languageCode: 'pt_BR',
          bodyParameters: [
            { type: 'text', text: timeStr },
            { type: 'text', text: therapistStr },
          ],
          organizationId: row.organization_id,
          patientId: row.patient_id,
          messageText: `Lembrete automático: sua sessão será às ${timeStr} com ${therapistStr}.`,
          appointmentId: row.id,
        };
        await env.BACKGROUND_QUEUE.send({ type: 'SEND_WHATSAPP', payload: queuePayload });
        whatsappSent++;
      } catch (err) {
        console.error(`[Cron] Failed to enqueue WhatsApp for ${row.patient_phone}:`, err);
      }
    }
  }
  console.log(`[Cron] Sent ${emailSent} emails and ${whatsappSent} WhatsApp reminders.`);
}

async function performDatabaseCleanup(pool: any, env: Env) {
  console.log('[Cron] Performing database maintenance...');
  
  try {
    // 1. Limpeza de Logs de Segurança (Manter apenas 90 dias)
    // Ações: LOGIN_SUCCESS, LOGIN_FAILURE
    const securityCleanup = await pool.query(`
      DELETE FROM audit_logs 
      WHERE action IN ('LOGIN_SUCCESS', 'LOGIN_FAILURE')
        AND created_at < (CURRENT_DATE - INTERVAL '90 days')
    `);
    console.log(`[Cleanup] Deleted ${securityCleanup.rowCount} old security logs.`);

    // 2. Limpeza de Logs de Sistema (Opcional, manter 1 ano se não for clínico)
    // Aqui poderíamos limpar INSERT/UPDATE de tabelas menos críticas, 
    // mas por segurança e legislação (20 anos para prontuários), 
    // manteremos os logs de 'patients', 'evolutions' e 'appointments' intactos.
    
    // 3. Limpeza de tokens expirados (se houver tabela de sessions ou tokens)
    // await pool.query('DELETE FROM auth_tokens WHERE expires_at < NOW()');

  } catch (error) {
    console.error('[Cleanup] Error during database maintenance:', error);
  }
}

async function prewarmDatabase(pool: any) {
  console.log('[Cron] Prewarming database cache after scale-to-zero...');
  try {
    // pg_prewarm carrega as tabelas mais acessadas no buffer cache do Postgres
    // Reduz latência das primeiras queries do dia após o banco acordar
    await pool.query(`
      SELECT
        pg_prewarm('appointments') AS appointments_blocks,
        pg_prewarm('patients')     AS patients_blocks,
        pg_prewarm('exercises')    AS exercises_blocks,
        pg_prewarm('sessions')     AS sessions_blocks,
        pg_prewarm('exercise_protocols') AS protocols_blocks
    `);
    console.log('[Cron] Database cache prewarmed successfully.');
  } catch (error) {
    console.warn('[Cron] Prewarm failed (non-critical):', error);
  }
}
