import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL });
const tables = ['patients', 'appointments', 'sessions', 'medical_records', 'servicos'];
await client.connect();
try {
  const result = {};
  for (const table of tables) {
    const cols = await client.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position
    `, [table]);
    const sample = await client.query(`SELECT * FROM ${table} LIMIT 2`);
    result[table] = { columns: cols.rows, sample: sample.rows };
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await client.end();
}
