/**
 * Backup Script: Supabase
 * Script para fazer backup completo do Supabase antes da migração
 */


// Configuração

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não configuradas');
  console.error('   VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

// Criar cliente Supabase com permissões de service role
const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Diretório de backup
 */
const BACKUP_DIR = path.join(process.cwd(), 'backups', `supabase-${new Date().toISOString().split('T')[0]}`);

console.log('📦 Iniciando backup do Supabase...');
console.log(`📁 Diretório de backup: ${BACKUP_DIR}`);

// Criar diretório de backup
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('✅ Diretório de backup criado');
}

/**
 * Lista de buckets a fazer backup
 */
const BUCKETS = [
  'exercise-videos',
  'exercise-thumbnails',
  'avatars',
  'comprovantes',
  'prontuarios',
  'evolucao',
];

/**
 * Lista de tabelas a fazer backup (dump via SQL)
 */
const TABLES = [
  'organizations',
  'profiles',
  'patients',
  'appointments',
  'payments',
  'patient_session_packages',
  'vouchers',
  'exercises',
  'exercise_plans',
  'exercise_plan_items',
  'medical_records',
  'treatment_sessions',
  'patient_progress',
  'assessment_templates',
  'assessment_sections',
  'assessment_questions',
  'patient_assessments',
  'assessment_responses',
  'medical_record_attachments',
  'invitations',
  'notifications',
  'audit_log',
];

/**
 * Faz download de todos os arquivos de um bucket
 */
async function backupBucket(bucketName: string): Promise<void> {
  console.log(`\n📥 Fazendo backup do bucket: ${bucketName}`);

  try {
    // Criar diretório para o bucket
    const bucketDir = path.join(BACKUP_DIR, 'storage', bucketName);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    // Listar todos os arquivos
    const { data: files, error } = await supabase.storage.from(bucketName).list('', {
      limit: 1000,
    });

    if (error) {
      console.warn(`⚠️  Erro ao listar bucket ${bucketName}:`, error.message);
      return;
    }

    if (!files || files.length === 0) {
      console.log(`   Bucket vazio ou sem permissão`);
      return;
    }

    console.log(`   ${files.length} arquivos encontrados`);

    // Download de cada arquivo
    let downloaded = 0;
    let skipped = 0;

    for (const file of files) {
      if (file.id === null) {
        // "pasta" ou diretório
        skipped++;
        continue;
      }

      try {
        const { data: fileData } = await supabase.storage.from(bucketName).download(file.name);

        if (!fileData) {
          console.warn(`   ⚠️  Falha ao download: ${file.name}`);
          continue;
        }

        // Salvar arquivo
        const filePath = path.join(bucketDir, file.name);
        const fileDir = path.dirname(filePath);

        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        // Converter Blob para Buffer e salvar
        const buffer = Buffer.from(await fileData.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        downloaded++;
      } catch (err: any) {
        console.warn(`   ⚠️  Erro no download de ${file.name}:`, err.message);
      }
    }

    console.log(`   ✅ ${downloaded} arquivos baixados, ${skipped} pastas ignoradas`);
  } catch (error: any) {
    console.error(`❌ Erro no backup do bucket ${bucketName}:`, error.message);
  }
}

/**
 * Faz backup dos dados de uma tabela (CSV)
 */
async function backupTable(tableName: string): Promise<void> {
  console.log(`📋 Exportando tabela: ${tableName}`);

  try {
    // Buscar todos os registros (com paginação se necessário)
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.warn(`   ⚠️  Erro ao buscar dados:`, error.message);
        hasMore = false;
        break;
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        page++;

        // Se retornou menos que pageSize, chegamos ao fim
        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`   ${allData.length} registros encontrados`);

    // Salvar como JSON
    const jsonPath = path.join(BACKUP_DIR, 'data', `${tableName}.json`);
    const dataDir = path.dirname(jsonPath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(jsonPath, JSON.stringify(allData, null, 2));

    console.log(`   ✅ ${tableName}.json salvo`);
  } catch (error: any) {
    console.error(`❌ Erro no backup da tabela ${tableName}:`, error.message);
  }
}

/**
 * Salva metadados do backup
 */
async function saveMetadata(): Promise<void> {
  const metadata = {
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    backupDirectory: BACKUP_DIR,
    buckets: BUCKETS,
    tables: TABLES,
  };

  const metadataPath = path.join(BACKUP_DIR, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\n✅ Metadados salvos em: ${metadataPath}`);
}

/**
 * Função principal
 */
async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('  SUPABASE BACKUP SCRIPT');
  console.log('========================================\n');

  // Testar conexão
  console.log('🔌 Testando conexão com Supabase...');
  const { data, error } = await supabase.from('profiles').select('count').limit(1);

  if (error) {
    console.error('❌ Erro de conexão:', error.message);
    process.exit(1);
  }

  console.log('✅ Conexão OK\n');

  // Backup de storage buckets
  console.log('\n--- BACKUP DE STORAGE BUCKETS ---');
  for (const bucket of BUCKETS) {
    await backupBucket(bucket);
  }

  // Backup de tabelas
  console.log('\n--- BACKUP DE TABELAS ---');
  for (const table of TABLES) {
    await backupTable(table);
  }

  // Salvar metadados
  await saveMetadata();

  console.log('\n========================================');
  console.log('  ✅ BACKUP CONCLUÍDO!');
  console.log('========================================\n');
  console.log(`📁 Local do backup: ${BACKUP_DIR}`);
  console.log('\n⚠️  Mantenha este backup seguro até');
  console.log('   confirmar que a migração foi bem-sucedida.\n');
}

// Executar
main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
