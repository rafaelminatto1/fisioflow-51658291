import { neon } from "@neondatabase/serverless";

const databaseUrl = 'postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(databaseUrl);

async function main() {
  console.log("Checking RLS integrity across all tables...");
  
  try {
    const res = await sql.query(`
      SELECT 
        t.tablename, 
        t.rowsecurity,
        COUNT(p.policyname) AS policy_count
      FROM pg_tables t
      LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
      WHERE t.schemaname = 'public' AND t.rowsecurity = true
      GROUP BY t.tablename, t.rowsecurity
      ORDER BY policy_count ASC, t.tablename ASC;
    `);
    
    console.log("--- Tables with RLS enabled and their policy counts ---");
    console.log("These tables have 0 policies (completely blocked!):");
    const blocked = res.rows.filter(r => parseInt(r.policy_count) === 0);
    console.log(JSON.stringify(blocked, null, 2));

    console.log("\nThese tables have 1 or more policies:");
    const active = res.rows.filter(r => parseInt(r.policy_count) > 0);
    console.log(active.map(r => `${r.tablename} (${r.policy_count})`).join(", "));
  } catch (error) {
    console.error("Failed to query RLS integrity:", error);
  }
}

main();
