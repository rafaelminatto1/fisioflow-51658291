#!/usr/bin/env node

import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local', override: true });
config({ path: '.env', override: false });

const sqlPath = resolve(
  process.cwd(),
  'src/server/db/migrations/0042_worker_route_residual_batch.sql',
);
const { Client } = pg;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida em .env/.env.local');
  return url;
}

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  const sql = readFileSync(sqlPath, 'utf8');
  const statements = splitStatements(sql);

  await client.connect();
  try {
    for (let index = 0; index < statements.length; index += 1) {
      await client.query(statements[index]);
      console.log(`applied ${index + 1}/${statements.length}`);
    }
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
