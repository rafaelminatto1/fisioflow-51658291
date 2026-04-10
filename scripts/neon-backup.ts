import axios from 'axios';
import dotenv from 'dotenv';
import { format } from 'date-fns';

dotenv.config({ path: '.env.production' });

/**
 * Script de Backup Automatizado para Neon DB (via API de Branching)
 * 
 * Este script cria um novo 'branch' (snapshot) do banco de dados principal
 * como uma camada extra de segurança ponto-a-ponto.
 * 
 * Requer: NEON_API_KEY no arquivo .env.production
 */

const NEON_API_KEY = process.env.NEON_API_KEY;
const PROJECT_ID = 'ep-wandering-bonus-acj4zwvo'; // ID detectado na connection string de produção
const PARENT_BRANCH_ID = 'main';
const RETENTION_DAYS = 7;

if (!NEON_API_KEY) {
  console.error('\n❌ ERRO: NEON_API_KEY não encontrada no .env.production');
  console.error('Por favor, configure sua chave de API do console Neon para continuar.');
  process.exit(1);
}

const client = axios.create({
  baseURL: 'https://console.neon.tech/api/v2',
  headers: {
    Authorization: `Bearer ${NEON_API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

async function runBackup() {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
  const backupName = `backup-${timestamp}`;

  console.log('\n--- FisioFlow Infrastructure: Database Backup ---');
  console.log(`🚀 Iniciando backup para o projeto ${PROJECT_ID}...`);

  try {
    // 1. Criar novo branch (Snapshot)
    console.log(`📦 Criando snapshot branch: ${backupName}...`);
    const createRes = await client.post(`/projects/${PROJECT_ID}/branches`, {
      branch: {
        parent_id: PARENT_BRANCH_ID,
        name: backupName,
      },
    });

    console.log(`✅ Snapshot criado com sucesso! (ID: ${createRes.data.branch.id})`);

    // 2. Limpar backups antigos (Retention)
    console.log('🧹 Verificando política de retenção (7 dias)...');
    const listRes = await client.get(`/projects/${PROJECT_ID}/branches`);
    const branches = listRes.data.branches;

    const backupBranches = branches.filter((b: any) => 
      b.name.startsWith('backup-') && (createRes.data.branch? b.id !== createRes.data.branch.id : true)
    );

    // Ordenar por data de criação (mais antigos primeiro)
    backupBranches.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    if (backupBranches.length > RETENTION_DAYS) {
      const toDelete = backupBranches.slice(0, backupBranches.length - RETENTION_DAYS);
      console.log(`♻️ Removendo ${toDelete.length} snapshots antigos da fila...`);

      for (const b of toDelete) {
        process.stdout.write(`🗑️ Deletando branch: ${b.name}... `);
        await client.delete(`/projects/${PROJECT_ID}/branches/${b.id}`);
        console.log('OK');
      }
    }

    console.log('✨ Operação de backup concluída com sucesso!');
    console.log('--------------------------------------------------\n');
  } catch (error: any) {
    console.error('\n❌ Falha Crítica no Backup fisioflow_db:');
    if (error.response?.data) {
      console.dir(error.response.data, { depth: null });
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

runBackup();
