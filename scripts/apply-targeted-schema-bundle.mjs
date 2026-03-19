#!/usr/bin/env node

import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';

config({ path: '.env.local', override: true });
config({ path: '.env', override: false });

const sqlPath = resolve(process.cwd(), 'scripts/migration/20260319_restore_missing_worker_tables.sql');

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida em .env/.env.local');
  return url;
}

function main() {
  const result = spawnSync(
    'psql',
    [getDatabaseUrl(), '-v', 'ON_ERROR_STOP=1', '-f', sqlPath],
    { stdio: 'inherit' },
  );

  if (result.error) throw result.error;
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
