import { Env } from './types/env';
import { createPool } from './lib/db';
import { triggerInngestEvent } from './lib/inngest-client';
import { sendAppointmentReminderEmail } from './lib/email';

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
      case "0 * * * *": // Every hour
        if (isBusinessHours) {
          await smartWarmup(pool);
        }
        break;

      case "0 9 * * *": // Daily at 9:00 AM
        await sendAppointmentReminders(pool, env, ctx);
        await processBirthdays(pool, env, ctx);
        await processInactivePatients(pool, env, ctx);
        break;
      
      case "0 0 * * *": // Daily at Midnight
        await generateDailyReports(pool, env);
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
    SELECT p.id, p.full_name, p.phone
    FROM patients p
    WHERE p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM appointments a 
        WHERE a.patient_id = p.id 
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

    // 2. WhatsApp Reminder
    if (row.patient_phone && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN) {
      try {
        const timeStr = row.time?.substring(0, 5) ?? '';
        const therapistStr = row.therapist_name || 'Fisioterapeuta';
        
        const metaRes = await fetch(`https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: row.patient_phone.replace(/\D/g, ''),
            type: 'template',
            template: {
              name: 'lembrete_sessao',
              language: { code: 'pt_BR' },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: timeStr },
                    { type: 'text', text: therapistStr },
                  ],
                },
              ],
            },
          }),
        });

        if (metaRes.ok) {
          whatsappSent++;
          // Log record in whatsapp_messages
          await pool.query(
            `INSERT INTO whatsapp_messages (
              organization_id, patient_id, from_phone, to_phone, message, type, status, metadata, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
            [
              row.organization_id,
              row.patient_id,
              'clinic',
              row.patient_phone,
              `Lembrete automático: sua sessão será às ${timeStr} com ${therapistStr}.`,
              'template',
              'sent',
              JSON.stringify({ appointment_id: row.id, template_key: 'lembrete_sessao', auto: true }),
            ],
          );
        }
      } catch (err) {
        console.error(`[Cron] Failed to send WhatsApp to ${row.patient_phone}:`, err);
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

async function generateDailyReports(pool: any, env: Env) {
  console.log('[Cron] Generating daily reports...');
  try {
    await pool.query(`
      SELECT
        COUNT(*) as total_appointments,
        COALESCE(SUM(payment_amount), 0) as total_revenue
      FROM appointments
      WHERE date = CURRENT_DATE - INTERVAL '1 day'
    `);
    console.log('[Cron] Daily report generated successfully.');
  } catch (error) {
    console.error('[Cron] Daily report generation failed:', error);
  }
}

async function smartWarmup(pool: any) {
  console.log('[Cron] Smart warmup: keeping Neon active during business hours...');
  try {
    // Queries ultra-leves apenas para manter a instância "awake"
    await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM patients WHERE is_active = true) as total_patients,
        (SELECT COUNT(*) FROM appointments WHERE date = CURRENT_DATE) as today_appointments,
        (SELECT NOW()) as server_time
    `);
  } catch (error) {
    console.warn('[Cron] Smart warmup failed:', error);
  }
}
