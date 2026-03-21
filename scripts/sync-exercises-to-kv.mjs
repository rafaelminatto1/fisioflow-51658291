#!/usr/bin/env node

/**
 * sync-exercises-to-kv.mjs
 * Busca exercícios do Neon e injeta no Cloudflare KV para cache de borda.
 */

import { config } from 'dotenv';
import pg from 'pg';
import { execSync } from 'node:child_process';

config({ path: '.env.local', override: true });
config({ path: '.env', override: false });

const { Client } = pg;
const KV_NAMESPACE_ID = "4284b33fa7ed40b6bc9c59b6041c03ed"; // FISIOFLOW_CONFIG (Produção)

async function main() {
  console.log("🚀 Iniciando sincronização Neon -> Cloudflare KV...");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  
  try {
    // 1. Buscar todos os exercícios ativos
    console.log("📦 Buscando exercícios no banco Neon...");
    const res = await client.query('SELECT * FROM exercises LIMIT 1000');
    const exercises = res.rows;
    console.log(`✅ Encontrados ${exercises.length} exercícios.`);

    // 2. Transformar para o formato de cache
    const exercisesJson = JSON.stringify(exercises);

    // 3. Salvar no KV usando a CLI do Wrangler
    // Salvaremos sob a chave 'global:exercises'
    console.log("☁️  Enviando para o Cloudflare KV (Edge Cache)...");
    
    // Usamos um arquivo temporário para evitar problemas de escape de shell com JSON gigante
    import('node:fs').then(fs => {
        fs.writeFileSync('temp_exercises.json', exercisesJson);
        try {
            // Sintaxe correta v3+: wrangler kv key put <key> --path <path>
            execSync(`npx wrangler kv key put "global:exercises" --namespace-id ${KV_NAMESPACE_ID} --path temp_exercises.json`, { stdio: 'inherit' });
            console.log("✨ Sincronização concluída com sucesso!");
        } catch (e) {
            console.error("❌ Erro ao enviar para o KV:", e.message);
        } finally {
            fs.unlinkSync('temp_exercises.json');
        }
    });

  } finally {
    await client.end();
  }
}

main().catch(console.error);
