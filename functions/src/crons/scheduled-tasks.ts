
/**
 * Job Agendado: Roda todo dia às 08:00 (Brasília)
 * Gera um resumo de pacientes que precisam de atenção hoje
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getPool } from '../init';
import { logger } from '../lib/logger';

export const dailyPatientDigest = onSchedule({
  schedule: 'every day 08:00',
  timeZone: 'America/Sao_Paulo',
  region: 'southamerica-east1',
}, async (event) => {
  const pool = getPool();

  try {
    logger.info('Running daily patient digest...');

    // Exemplo: Buscar pacientes com agendamento hoje que não tem evolução há mais de 15 dias
    const result = await pool.query(`
      SELECT p.name, p.email, a.date
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date = CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM medical_records mr 
        WHERE mr.patient_id = p.id 
        AND mr.record_date > CURRENT_DATE - INTERVAL '15 days'
      )
    `);

    logger.info(`Found ${result.rows.length} patients requiring clinical review.`);

    // Aqui você poderia integrar com sua API de WhatsApp ou Email
    // for (const row of result.rows) { ... }

  } catch (error) {
    logger.error('Error in dailyPatientDigest:', error);
  }
});
