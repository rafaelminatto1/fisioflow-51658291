import axios from 'axios';
import dotenv from 'dotenv';
import { format } from 'date-fns';
import { existsSync, readFileSync } from 'node:fs';

dotenv.config({ path: '.env.production' });
dotenv.config();

/**
 * Script de Backup Automatizado para Neon DB (via API de Branching)
 * 
 * Este script cria um novo 'branch' (snapshot) do banco de dados principal
 * como uma camada extra de segurança ponto-a-ponto.
 * 
 * Requer: NEON_API_KEY no arquivo .env.production
 */

const NEON_API_KEY = process.env.NEON_API_KEY;
const NEON_CONFIG = readNeonConfig();
const PROJECT_ID = process.env.NEON_PROJECT_ID ?? NEON_CONFIG?.projectId;
const PARENT_BRANCH = process.env.NEON_PARENT_BRANCH ?? process.env.NEON_PARENT_BRANCH_ID ?? 'main';
const RETENTION_DAYS = Number.parseInt(process.env.NEON_BACKUP_RETENTION_DAYS ?? '7', 10);

if (!NEON_API_KEY) {
  console.error('\n❌ ERRO: NEON_API_KEY não encontrada no .env.production');
  console.error('Por favor, configure sua chave de API do console Neon para continuar.');
  process.exit(1);
}

if (!PROJECT_ID) {
  console.error('\n❌ ERRO: NEON_PROJECT_ID não configurado e .neon indisponível.');
  process.exit(1);
}

if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS < 1) {
  console.error('\n❌ ERRO: NEON_BACKUP_RETENTION_DAYS deve ser um número maior que zero.');
  process.exit(1);
}

const NEON_PROJECT_ID = PROJECT_ID;

const client = axios.create({
  baseURL: 'https://console.neon.tech/api/v2',
  headers: {
    Authorization: `Bearer ${NEON_API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

function readNeonConfig(): { projectId?: string } | null {
  if (!existsSync('.neon')) return null;
  try {
    return JSON.parse(readFileSync('.neon', 'utf8')) as { projectId?: string };
  } catch {
    return null;
  }
}

type NeonBranch = {
  id: string;
  name: string;
  created_at: string;
};

async function listBranches(): Promise<NeonBranch[]> {
  const res = await client.get(`/projects/${NEON_PROJECT_ID}/branches`);
  return res.data.branches as NeonBranch[];
}

async function runBackup() {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
  const backupName = `backup-${timestamp}`;

  console.log('\n--- FisioFlow Infrastructure: Database Backup ---');
  console.log(`🚀 Iniciando backup para o projeto ${NEON_PROJECT_ID}...`);

  try {
    const branches = await listBranches();
    const parentBranch = branches.find((branch) => branch.id === PARENT_BRANCH || branch.name === PARENT_BRANCH);

    if (!parentBranch) {
      throw new Error(`Branch pai "${PARENT_BRANCH}" não encontrada no projeto Neon ${NEON_PROJECT_ID}.`);
    }

    // 1. Criar novo branch (Snapshot)
    console.log(`📦 Criando snapshot branch: ${backupName} a partir de ${parentBranch.name} (${parentBranch.id})...`);
    const createRes = await client.post(`/projects/${NEON_PROJECT_ID}/branches`, {
      branch: {
        parent_id: parentBranch.id,
        name: backupName,
      },
    });

    console.log(`✅ Snapshot criado com sucesso! (ID: ${createRes.data.branch.id})`);

    // 2. Limpar backups antigos (Retention)
    console.log(`🧹 Verificando política de retenção (${RETENTION_DAYS} snapshots)...`);
    const refreshedBranches = await listBranches();

    const backupBranches = refreshedBranches.filter((b: NeonBranch) => 
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
        await client.delete(`/projects/${NEON_PROJECT_ID}/branches/${b.id}`);
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
