import { Pool } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

async function optimizeDatabase() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });

  try {
    console.log("Otimizando índices do banco de dados para velocidade máxima...");

    // Índice composto para busca ultra-rápida na Agenda
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_org_date_time 
      ON appointments (organization_id, date, start_time);
    `);

    console.log("✅ Índice de agendamentos criado!");
  } catch (e) {
    console.error("❌ Falha na otimização:", e);
  } finally {
    await pool.end();
  }
}

optimizeDatabase();
