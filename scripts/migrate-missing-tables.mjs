#!/usr/bin/env node
/**
 * Cria tabelas faltantes no Neon DB:
 *   - conduct_library
 *   - crm_campanhas + crm_campanha_envios
 *   - formas_pagamento
 */
import pg from 'pg';

const { Client } = pg;
const DB_URL = 'postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const SQL = `
-- ═══════════════════════════════════════════════════════
-- conduct_library
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS conduct_library (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  created_by      TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  conduct_text    TEXT NOT NULL,
  category        TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- crm_campanhas
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_campanhas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL,
  created_by           TEXT,
  nome                 TEXT NOT NULL,
  tipo                 TEXT NOT NULL,
  conteudo             TEXT,
  status               TEXT DEFAULT 'concluida',
  total_destinatarios  INTEGER DEFAULT 0,
  total_enviados       INTEGER DEFAULT 0,
  agendada_em          TIMESTAMPTZ,
  concluida_em         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- crm_campanha_envios
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_campanha_envios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id  UUID NOT NULL REFERENCES crm_campanhas(id) ON DELETE CASCADE,
  patient_id   UUID,
  canal        TEXT,
  status       TEXT DEFAULT 'enviado',
  enviado_em   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- formas_pagamento
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS formas_pagamento (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL,
  nome              TEXT NOT NULL,
  tipo              TEXT DEFAULT 'geral',
  taxa_percentual   NUMERIC(5,2) DEFAULT 0,
  dias_recebimento  INTEGER DEFAULT 0,
  ativo             BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('✅ Conectado ao Neon DB');

  try {
    await client.query(SQL);
    console.log('✅ Tabelas criadas (ou já existiam)');

    // Verifica quais existem
    for (const table of ['conduct_library', 'crm_campanhas', 'crm_campanha_envios', 'formas_pagamento']) {
      const res = await client.query(`SELECT to_regclass($1)::text AS t`, [`public.${table}`]);
      const exists = Boolean(res.rows[0]?.t);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
