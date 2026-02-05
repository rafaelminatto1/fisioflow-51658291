/**
 * Exporta templates de exercícios (e itens) do Supabase para arquivos JSON locais.
 * Depois use migrate-exercise-templates-from-supabase.mjs --from-file para gravar no Firestore.
 *
 * Uso:
 *   node scripts/migration/export-exercise-templates-from-supabase.mjs
 *   node scripts/migration/export-exercise-templates-from-supabase.mjs --output-templates=backup_templates.json --output-items=backup_items.json
 *
 * .env necessário: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../../.env') });

const outputTemplatesArg = process.argv.find((a) => a.startsWith('--output-templates='));
const outputItemsArg = process.argv.find((a) => a.startsWith('--output-items='));
const outputTemplatesPath = outputTemplatesArg ? outputTemplatesArg.split('=')[1] : 'exercise_templates_export.json';
const outputItemsPath = outputItemsArg ? outputItemsArg.split('=')[1] : 'exercise_template_items_export.json';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  EXPORTAR TEMPLATES DE EXERCÍCIOS (Supabase → JSON)          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let totalTemplates = 0;
  let totalItems = 0;

  const { data: templates, error: errTemplates } = await supabase.from('exercise_templates').select('*');
  if (errTemplates) {
    console.error('❌ Erro Supabase exercise_templates:', errTemplates.message);
    process.exit(1);
  }
  if (templates?.length) {
    const outPath = path.isAbsolute(outputTemplatesPath) ? outputTemplatesPath : path.join(process.cwd(), outputTemplatesPath);
    fs.writeFileSync(outPath, JSON.stringify(templates, null, 2), 'utf8');
    totalTemplates = templates.length;
    console.log(`✅ Templates: ${totalTemplates} registros → ${outPath}`);
  } else {
    console.log('⚠️  Nenhum registro em exercise_templates.');
  }

  const { data: items, error: errItems } = await supabase.from('exercise_template_items').select('*');
  if (errItems) {
    console.error('❌ Erro Supabase exercise_template_items:', errItems.message);
    process.exit(1);
  }
  if (items?.length) {
    const outPath = path.isAbsolute(outputItemsPath) ? outputItemsPath : path.join(process.cwd(), outputItemsPath);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    totalItems = items.length;
    console.log(`✅ Itens: ${totalItems} registros → ${outPath}`);
  } else {
    console.log('⚠️  Nenhum registro em exercise_template_items.');
  }

  console.log('\nPara migrar para o Firebase:');
  console.log('  node scripts/migration/migrate-exercise-templates-from-supabase.mjs --from-file=exercise_templates_export.json --from-file-items=exercise_template_items_export.json');
  console.log('  (defina FIREBASE_SERVICE_ACCOUNT_KEY_PATH no .env)\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
