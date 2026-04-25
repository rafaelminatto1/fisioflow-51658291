import { Pool } from "pg";

async function fix() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgres://u9v568jltcl96:p4076395f190e38bc9e9d9688755018693c04230113c233157e937f26d2e617a2@cepsgsq7v6itj.cluster-czrs8kj4isgq.us-east-1.rds.amazonaws.com:5432/db9fefcfbc04074a63342a9212e1b4f",
  });
  try {
    console.log("Tentando criar índice de unicidade...");
    await pool.query(
      "ALTER TABLE business_hours ADD CONSTRAINT idx_business_hours_org_day_unique UNIQUE (organization_id, day_of_week)",
    );
    console.log("Sucesso!");
  } catch (e: any) {
    console.log("Erro:", e.message);
  } finally {
    await pool.end();
  }
}
fix();
