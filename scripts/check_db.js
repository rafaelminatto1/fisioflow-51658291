import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  let res = await client.query('SELECT name, count(*) as count FROM exercise_protocols GROUP BY name HAVING count(*) > 1');
  console.log("Duplicated protocols:", res.rows);
  
  if (res.rows.length > 0) {
    let allDuplicates = await client.query('SELECT id, name, created_at FROM exercise_protocols WHERE name IN (SELECT name FROM exercise_protocols GROUP BY name HAVING count(*) > 1) ORDER BY name, created_at ASC');
    console.log("All rows for duplicated protocols:", allDuplicates.rows);
  }

  await client.end();
}
run();
