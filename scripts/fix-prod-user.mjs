import { Pool } from '@neondatabase/serverless';
import 'dotenv/config';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function fixUser() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Iniciando criação manual do usuário mestre (V2)...");
    
    // 1. Garantir que a organização padrão existe
    await pool.query(
      "INSERT INTO organizations (id, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (id) DO NOTHING",
      [DEFAULT_ORG_ID, 'Mooca Fisio']
    );

    // 2. Criar o usuário
    const res = await pool.query(
      `INSERT INTO users (
        id, email, email_verified, full_name, role, organization_id, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, true, $2, 'admin', $3, NOW(), NOW()
      ) ON CONFLICT (email) DO UPDATE SET role = 'admin', organization_id = $3
      RETURNING id, email, role, organization_id`,
      ['rafael.minatto@yahoo.com.br', 'Rafael Minatto', DEFAULT_ORG_ID]
    );

    console.log("SUCESSO: Usuário administrativo vinculado!");
    console.table(res.rows);
    
  } catch (err) {
    console.error("Erro ao consertar usuário:", err);
  } finally {
    await pool.end();
  }
}

fixUser();
