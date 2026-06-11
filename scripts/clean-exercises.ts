import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function run() {
  console.log("Iniciando limpeza de exercicios...");
  const before = await pool.query("SELECT COUNT(*) FROM exercises");
  console.log("Total antes:", before.rows[0].count);

  const deleteQuery = `
    DELETE FROM exercises 
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn 
        FROM exercises
      ) t WHERE t.rn > 1
    )
  `;
  const result = await pool.query(deleteQuery);
  console.log("Exercícios duplicados deletados:", result.rowCount);

  const after = await pool.query("SELECT COUNT(*) FROM exercises");
  console.log("Total depois:", after.rows[0].count);

  await pool.end();
}

run().catch(console.error);
