import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  try {
    const res = await sql`SELECT count(*) FROM transacoes`;
    console.log("Transacoes count:", res[0].count);
  } catch (err) {
    console.error("Transacoes error:", err.message);
  }
  
  try {
    const res = await sql`SELECT count(*) FROM pagamentos`;
    console.log("Pagamentos count:", res[0].count);
  } catch (err) {
    console.error("Pagamentos error:", err.message);
  }
}
run();
