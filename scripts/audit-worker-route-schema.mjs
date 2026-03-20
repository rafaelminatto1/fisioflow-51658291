#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local', override: true });
config({ path: '.env', override: false });

const { Client } = pg;
const ROUTES_DIR = resolve(process.cwd(), 'workers/src/routes');
const SQL_REF_REGEX = /\b(FROM|JOIN|INTO|UPDATE|DELETE FROM)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
const IGNORED_REFS = new Set([
  'LATERAL',
  'SET',
  'TRIAGE',
  'data',
  'ranked_pathologies',
  'information_schema',
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (fullPath.endsWith('.ts')) files.push(fullPath);
  }
  return files;
}

function collectCteRefs(text) {
  const refs = new Set();
  const cteRegex = /(?:\bWITH(?:\s+RECURSIVE)?|,)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/g;
  let match;
  while ((match = cteRegex.exec(text))) {
    refs.add(match[1]);
  }
  return refs;
}

function collectRouteRefs() {
  const refs = new Map();
  for (const file of walk(ROUTES_DIR)) {
    const text = readFileSync(file, 'utf8');
    const cteRefs = collectCteRefs(text);
    let match;
    while ((match = SQL_REF_REGEX.exec(text))) {
      const ref = match[2];
      if (IGNORED_REFS.has(ref)) continue;
      if (cteRefs.has(ref)) continue;
      if (!refs.has(ref)) refs.set(ref, new Set());
      refs.get(ref).add(file);
    }
  }
  return refs;
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida em .env/.env.local');
  return url;
}

async function main() {
  const refs = collectRouteRefs();
  const names = [...refs.keys()].sort();
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const tableRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
      [names],
    );
    const functionRes = await client.query(
      "SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = ANY($1::text[])",
      [names],
    );

    const tables = new Set(tableRes.rows.map((row) => String(row.table_name)));
    const functions = new Set(functionRes.rows.map((row) => String(row.proname)));

    const presentTables = [];
    const presentFunctions = [];
    const missing = [];

    for (const name of names) {
      const files = [...refs.get(name)].sort();
      const guardRegex = new RegExp(`hasTable\\([^\\n]*['"\`]${escapeRegExp(name)}['"\`]`);
      const guardedFiles = files.filter((file) => guardRegex.test(readFileSync(file, 'utf8')));
      if (tables.has(name)) {
        presentTables.push({ name, files, guardedFiles });
      } else if (functions.has(name)) {
        presentFunctions.push({ name, files, guardedFiles });
      } else {
        missing.push({
          name,
          files,
          guardedFiles,
          guardedInAnyFile: guardedFiles.length > 0,
          guardedInAllFiles: guardedFiles.length === files.length,
        });
      }
    }

    console.log(JSON.stringify({
      summary: {
        totalRefs: names.length,
        presentTables: presentTables.length,
        presentFunctions: presentFunctions.length,
        missing: missing.length,
      },
      missing,
      presentFunctions,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
