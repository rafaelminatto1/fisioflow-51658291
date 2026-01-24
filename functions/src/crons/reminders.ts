import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Pool } from 'pg';

export const dailyReminders = onSchedule('every day 08:00', async (event) => {
  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
  });

  try {
    // Buscar agendamentos de hoje
    const result = await pool.query(`
      SELECT a.*, p.name, p.phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date = CURRENT_DATE AND a.status = 'agendado'
    `);

    console.log(`Enviando ${result.rows.length} lembretes...`);
    
    // Lógica de envio (WhatsApp/Email) aqui
    
  } finally {
    await pool.end();
  }
});
