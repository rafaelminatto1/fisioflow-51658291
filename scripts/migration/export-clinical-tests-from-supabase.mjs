/**
 * Exporta testes clínicos do Supabase para um arquivo JSON local.
 * Útil para depois rodar a migração para o Firebase com --from-file (sem precisar
 * do Supabase na máquina que fará o deploy).
 *
 * Uso:
 *   node scripts/migration/export-clinical-tests-from-supabase.mjs
 *   node scripts/migration/export-clinical-tests-from-supabase.mjs --table=clinical_test_templates
 *   node scripts/migration/export-clinical-tests-from-supabase.mjs --output=backup_tests.json
 *
 * .env necessário: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY)
 *
 * Depois, para migrar para o Firebase:
 *   node scripts/migration/migrate-clinical-tests-from-supabase.mjs --from-file=clinical_tests_export.json
 *   (com FIREBASE_SERVICE_ACCOUNT_KEY_PATH no .env)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../../.env') });

const tableArg = process.argv.find((a) => a.startsWith('--table='));
const sourceTable = tableArg ? tableArg.split('=')[1] : 'assessment_test_configs';
const outputArg = process.argv.find((a) => a.startsWith('--output='));
const outputPath = outputArg ? outputArg.split('=')[1] : 'clinical_tests_export.json';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  EXPORTAR TESTES CLÍNICOS (Supabase → JSON)                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Tabela: ${sourceTable}`);
  console.log(`Saída: ${outputPath}\n`);

  const { data, error } = await supabase.from(sourceTable).select('*');

  if (error) {
    console.error('❌ Erro Supabase:', error.message);
    process.exit(1);
  }

  if (!data?.length) {
    console.log('⚠️  Nenhum registro encontrado na tabela.');
    process.exit(0);
  }

  const outPath = path.isAbsolute(outputPath) ? outputPath : path.join(process.cwd(), outputPath);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`✅ Exportados ${data.length} registros para ${outPath}`);
  console.log('\nPara migrar para o Firebase:');
  console.log(`  node scripts/migration/migrate-clinical-tests-from-supabase.mjs --from-file=${path.basename(outPath)}`);
  console.log('  (defina FIREBASE_SERVICE_ACCOUNT_KEY_PATH no .env)\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
