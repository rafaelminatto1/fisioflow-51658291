import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const cols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='servicos'
    ORDER BY ordinal_position
  `);
  const rows = await client.query(`SELECT * FROM servicos LIMIT 5`);
  console.log(JSON.stringify({ columns: cols.rows, rows: rows.rows }, null, 2));
} finally { await client.end(); }
