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
const PROJECT_ID = 'ep-wandering-bonus-acj4zwvo'; // ID detectado na connection string
const PARENT_BRANCH_ID = 'main';
const RETENTION_DAYS = 7;

if (!NEON_API_KEY) {
  console.error('❌ ERRO: NEON_API_KEY não encontrada no .env.production');
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

  console.log(`🚀 Iniciando backup automatizado para o projeto ${PROJECT_ID}...`);

  try {
    // 1. Criar novo branch (Snapshot)
    console.log(`📦 Criando branch de backup: ${backupName}...`);
    const createRes = await client.post(`/projects/${PROJECT_ID}/branches`, {
      branch: {
        parent_id: PARENT_BRANCH_ID,
        name: backupName,
      },
    });

    console.log(`✅ Backup criado com sucesso! Branch ID: ${createRes.data.branch.id}`);

    // 2. Limpar backups antigos (Retention)
    console.log('🧹 Verificando backups antigos para limpeza...');
    const listRes = await client.get(`/projects/${PROJECT_ID}/branches`);
    const branches = listRes.data.branches;

    const backupBranches = branches.filter((b: any) => 
      b.name.startsWith('backup-') && b.id !== createRes.data.branch.id
    );

    // Ordenar por data de criação (mais antigos primeiro)
    backupBranches.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    if (backupBranches.length > RETENTION_DAYS) {
      const toDelete = backupBranches.slice(0, backupBranches.length - RETENTION_DAYS);
      console.log(`♻️ Removendo ${toDelete.length} backups antigos...`);

      for (const b of toDelete) {
        console.log(`🗑️ Deletando branch: ${b.name} (${b.id})...`);
        await client.delete(`/projects/${PROJECT_ID}/branches/${b.id}`);
      }
    }

    console.log('✨ Operação de backup concluída!');
  } catch (error: any) {
    console.error('❌ Falha no backup:', error.response?.data || error.message);
    process.exit(1);
  }
}

runBackup();
