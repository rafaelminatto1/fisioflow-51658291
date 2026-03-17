#!/usr/bin/env node
/**
 * drizzle-baseline.mjs
 *
 * Inicializa o tracking de migrations do drizzle-kit marcando as migrations
 * existentes (0000 e 0001) como já aplicadas, sem re-executar o SQL.
 *
 * Execute uma única vez para migrar do workflow "db:push" para "db:migrate":
 *   node scripts/drizzle-baseline.mjs
 */

import pg from 'pg';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = join(__dirname, '../drizzle');

const { Client } = pg;

const MIGRATIONS = [
  { tag: '0000_nebulous_ironclad', when: 1773537784114 },
  { tag: '0001_numerous_bastion', when: 1773697166972 },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL não definida. Exporte antes de rodar.');
    process.exit(1);
  }

  // Remove channel_binding que o pg nativo não suporta
  const cleanUrl = dbUrl.replace(/[?&]channel_binding=[^&]*/g, '').replace(/\?$/, '');
  const client = new Client({ connectionString: cleanUrl });
  await client.connect();
  console.log('✅ Conectado ao banco');

  try {
    // 1. Cria schema e tabela de tracking (idempotente)
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    console.log('✅ Tabela drizzle.__drizzle_migrations pronta');

    // 2. Verifica o que já está registrado
    const { rows: existing } = await client.query(
      `SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at ASC`
    );
    const existingTimestamps = new Set(existing.map(r => String(r.created_at)));

    // 3. Insere cada migration não registrada
    for (const { tag, when } of MIGRATIONS) {
      if (existingTimestamps.has(String(when))) {
        console.log(`⏭  ${tag} já registrada, pulando`);
        continue;
      }
      const sql = readFileSync(join(DRIZZLE_DIR, `${tag}.sql`), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [hash, when]
      );
      console.log(`✅ ${tag} marcada como aplicada`);
    }

    console.log('\n🎉 Baseline concluído! Agora use:');
    console.log('   pnpm db:generate  → gera migration SQL (sem DB connection)');
    console.log('   pnpm db:migrate   → aplica apenas novas migrations (rápido)');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
