import { Pool } from '@neondatabase/serverless';
import 'dotenv/config';

async function checkUser() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      "SELECT id, full_name, email, role, organization_id, is_active FROM users WHERE email = $1",
      ['REDACTED_EMAIL']
    );
    console.log("DADOS DO USUÁRIO NA TABELA 'USERS':");
    console.table(res.rows);
    
    if (res.rows.length === 0) {
      console.log("ERRO: Usuário não encontrado na tabela 'users'. Verifique se o e-mail está correto.");
    }
  } catch (err) {
    console.error("Erro ao consultar Neon:", err);
  } finally {
    await pool.end();
  }
}

checkUser();
