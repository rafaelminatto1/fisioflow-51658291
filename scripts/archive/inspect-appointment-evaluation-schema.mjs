import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const enums = await client.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname IN ('appointment_status', 'appointment_type', 'session_status')
    ORDER BY t.typname, e.enumsortorder
  `);
  const cols = await client.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN ('appointments','medical_records','evaluation_forms','patient_evaluations','evaluations')
    ORDER BY table_name, ordinal_position
  `);
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name ILIKE '%evalu%'
    ORDER BY table_name
  `);
  console.log(JSON.stringify({ enums: enums.rows, tables: tables.rows, columns: cols.rows }, null, 2));
} finally { await client.end(); }
