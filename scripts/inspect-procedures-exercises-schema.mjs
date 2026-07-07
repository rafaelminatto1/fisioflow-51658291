import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public'
      AND (table_name ILIKE '%procedure%'
        OR table_name ILIKE '%procedimento%'
        OR table_name ILIKE '%service%'
        OR table_name ILIKE '%servico%'
        OR table_name ILIKE '%exercise%'
        OR table_name ILIKE '%session%'
        OR table_name ILIKE '%template%'
        OR table_name ILIKE '%protocol%')
    ORDER BY table_name
  `);
  const columns = await client.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name = ANY($1::text[])
    ORDER BY table_name, ordinal_position
  `, [tables.rows.map(r => r.table_name)]);
  const counts = [];
  for (const { table_name } of tables.rows) {
    try {
      const r = await client.query(`SELECT count(*)::int AS count FROM ${JSON.stringify(table_name).replaceAll('"','')}`);
      counts.push({ table_name, count: r.rows[0].count });
    } catch (e) {
      counts.push({ table_name, error: e.message });
    }
  }
  console.log(JSON.stringify({ tables: tables.rows, counts, columns: columns.rows }, null, 2));
} finally {
  await client.end();
}
