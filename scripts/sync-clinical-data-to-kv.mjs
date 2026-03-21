/**
 * Sync Clinical Data to Cloudflare KV
 * 
 * Este script sincroniza protocolos do banco Neon e patologias das constantes
 * para o Cloudflare KV (FISIOFLOW_CONFIG) para carregamento instantâneo.
 */

import 'dotenv/config';
import { Client } from 'pg';
import { PATHOLOGY_OPTIONS } from '../src/lib/constants/pathologies.ts';

// Configurações Cloudflare (Valores obtidos do ambiente/projeto)
const CF_ACCOUNT_ID = '32156f9a72a32d1ece28ab74bcd398fb';
const CF_KV_NAMESPACE_ID = '4284b33fa7ed40b6bc9c59b6041c03ed';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function syncToKV(key, value) {
  if (!CF_API_TOKEN) {
    console.error('❌ Erro: CLOUDFLARE_API_TOKEN não definido no .env');
    process.exit(1);
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/values/${key}`;
  
  console.log(`📤 Sincronizando chave KV: ${key}...`);
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'text/plain', // KV values are stored as strings/blobs
    },
    body: JSON.stringify(value),
  });

  if (response.ok) {
    console.log(`✅ Chave ${key} sincronizada com sucesso!`);
  } else {
    const error = await response.json();
    console.error(`❌ Erro ao sincronizar ${key}:`, error);
  }
}

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Conectando ao Banco Neon...');
    await client.connect();

    // 1. Sincronizar Protocolos
    console.log('🔍 Buscando protocolos no banco...');
    const protocolsRes = await client.query('SELECT * FROM exercise_protocols WHERE is_active = true');
    await syncToKV('CLINICAL_PROTOCOLS', protocolsRes.rows);

    // 2. Sincronizar Patologias (das constantes)
    console.log('🔍 Preparando patologias...');
    await syncToKV('CLINICAL_PATHOLOGY_OPTIONS', PATHOLOGY_OPTIONS);

    console.log('\n✨ Sincronização concluída com sucesso!');
  } catch (err) {
    console.error('💥 Erro fatal durante a sincronização:', err);
  } finally {
    await client.end();
  }
}

run();
