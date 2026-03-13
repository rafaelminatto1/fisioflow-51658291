import { Env } from './types/env';
import { createPool } from './lib/db';

import { triggerInngestEvent } from './lib/inngest-client';

/**
 * Cloudflare Worker Cron Trigger Handler
 */
export async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const pool = createPool(env);
  const cron = event.cron;

  console.log(`[Cron] Executing job: ${cron} at ${new Date().toISOString()}`);

  try {
    switch (cron) {
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

async function sendAppointmentReminders(pool: any, env: Env, ctx: ExecutionContext) {
  // Já gerenciado via eventos Inngest no momento da criação, 
  // mas aqui serviria como um fallback de segurança.
  console.log('[Cron] Syncing daily reminders...');
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
