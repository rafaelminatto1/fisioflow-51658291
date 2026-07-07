const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_nTAuw09pLXRx@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-wandering-bonus-acj4zwvo"
  });
  
  await client.connect();
  const org_id = '00000000-0000-0000-0000-000000000000'; // dummy UUID
  const monthStart = new Date();
  
  try {
    const totals = await client.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE enabled = true)::int AS active FROM automations WHERE org_id = $1`, [org_id]);
    console.log("totals:", totals.rows);
  } catch (e) {
    console.error("totals ERROR:", e.message);
  }

  try {
    const runs = await client.query(`SELECT COUNT(*)::int AS runs_this_month, COUNT(*) FILTER (WHERE status = 'success')::int AS successes, MAX(started_at) AS last_run_at FROM automation_logs WHERE organization_id = $1 AND started_at >= $2`, [org_id, monthStart]);
    console.log("runs:", runs.rows);
  } catch (e) {
    console.error("runs ERROR:", e.message);
  }

  try {
    const perAutomation = await client.query(`SELECT a.id, a.name, COUNT(l.id) FILTER (WHERE l.started_at >= $2)::int AS runs_this_month, COUNT(l.id) FILTER (WHERE l.started_at >= $2 AND l.status <> 'success')::int AS failures, MAX(l.started_at) AS last_run_at FROM automations a LEFT JOIN automation_logs l ON l.automation_id = a.id AND l.organization_id = $1 WHERE a.org_id = $1 GROUP BY a.id, a.name`, [org_id, monthStart]);
    console.log("perAutomation:", perAutomation.rows);
  } catch (e) {
    console.error("perAutomation ERROR:", e.message);
  }
  
  await client.end();
}
test();
