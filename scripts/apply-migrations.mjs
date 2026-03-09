/**
 * Script para aplicar migrations pendentes no Neon DB de produção.
 * Uso: node scripts/apply-migrations.mjs
 */
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../src/server/db/migrations');

const CONN = 'postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb';

// SQL para criar tabelas pré-requisito que não têm migration dedicada
const PREREQUISITES_SQL = `
-- Tabela organizations (usada como FK em muitas migrations, mas nunca criada formalmente)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'FisioFlow Clinic',
  slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'FisioFlow Clinic', 'fisioflow')
ON CONFLICT (id) DO NOTHING;

-- Tabelas evaluation_forms e evaluation_form_fields (usadas no frontend mas sem migration)
CREATE TABLE IF NOT EXISTS evaluation_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  created_by text,
  nome text NOT NULL,
  descricao text,
  referencias text,
  tipo text NOT NULL DEFAULT 'anamnese',
  ativo boolean NOT NULL DEFAULT true,
  is_favorite boolean NOT NULL DEFAULT false,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  cover_image text,
  estimated_time integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evaluation_forms_org ON evaluation_forms (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS evaluation_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES evaluation_forms(id) ON DELETE CASCADE,
  tipo_campo text NOT NULL,
  label text NOT NULL,
  placeholder text,
  opcoes jsonb,
  ordem integer NOT NULL DEFAULT 0,
  obrigatorio boolean NOT NULL DEFAULT false,
  grupo text,
  descricao text,
  minimo numeric,
  maximo numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evaluation_form_fields_form ON evaluation_form_fields (form_id, ordem);
`;

// Migrations a aplicar em ordem
const MIGRATIONS = [
  '0018_exercise_sessions.sql',
  '0022_time_entries.sql',
  '0022_innovations_support.sql',
  '0023_tarefas_invitations_surveys.sql',
  '0023_lgpd_consents.sql',
  '0024_wearables_annotations_signatures.sql',
  '0024_vouchers.sql',
  '0025_evento_templates_and_standardized_tests.sql',
  '0026_asset_annotations.sql',
  '0027_patient_evaluation_responses.sql',
  '0028_activity_lab.sql',
  '0029_knowledge_base.sql',
  '0030_marketing.sql',
  '0031_wiki_library.sql',
];

async function runSQL(client, label, sql) {
  try {
    await client.query(sql);
    console.log(`  ✅ ${label}`);
    return true;
  } catch (err) {
    console.error(`  ❌ ${label}: ${err.message}`);
    return false;
  }
}

async function main() {
  const client = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('🔗 Conectado ao Neon DB\n');

  // 1. Pré-requisitos
  console.log('📋 Criando tabelas pré-requisito...');
  await runSQL(client, 'organizations + evaluation_forms + evaluation_form_fields', PREREQUISITES_SQL);

  // 2. Migrations
  console.log('\n🚀 Aplicando migrations...');
  let success = 0;
  let failed = 0;
  for (const file of MIGRATIONS) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const ok = await runSQL(client, file, sql);
    if (ok) success++; else failed++;
  }

  console.log(`\n📊 Resultado: ${success} OK, ${failed} falhou`);
  await client.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
