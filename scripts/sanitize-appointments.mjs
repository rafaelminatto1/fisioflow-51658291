
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function sanitizeAppointments() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });

  try {
    console.log('Sanitizando banco de dados...');

    // Passo 1: Limpar campos que são strings vazias ou literais 'null'
    await pool.query(`
      UPDATE appointments 
      SET start_time = NULL 
      WHERE start_time = '' OR start_time = 'null';
    `);

    await pool.query(`
      UPDATE appointments 
      SET end_time = NULL 
      WHERE end_time = '' OR end_time = 'null';
    `);

    // Passo 2: Definir horário padrão para quem não tem
    const fixStart = await pool.query(`
      UPDATE appointments 
      SET start_time = '08:00', updated_at = NOW() 
      WHERE start_time IS NULL;
    `);
    console.log(`- Start time corrigido: ${fixStart.rowCount}`);

    // Passo 3: Corrigir durações inválidas
    const fixDur = await pool.query(`
      UPDATE appointments 
      SET duration_minutes = 60, updated_at = NOW() 
      WHERE duration_minutes IS NULL OR duration_minutes <= 0;
    `);
    console.log(`- Duração corrigida: ${fixDur.rowCount}`);

    // Passo 4: Recalcular end_time baseado no start_time + duration
    const fixEnd = await pool.query(`
      UPDATE appointments 
      SET end_time = (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval)::text, updated_at = NOW()
      WHERE end_time IS NULL;
    `);
    console.log(`- End time calculado: ${fixEnd.rowCount}`);

    console.log('Sanitização completa!');
  } catch (e) {
    console.error('Falha crítica:', e);
  } finally {
    await pool.end();
  }
}

sanitizeAppointments();
