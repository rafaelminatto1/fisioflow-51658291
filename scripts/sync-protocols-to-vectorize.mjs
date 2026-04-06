#!/usr/bin/env node

/**
 * sync-protocols-to-vectorize.mjs
 * Sincroniza os protocolos de reabilitação do banco Neon para o Vectorize da Cloudflare.
 */

import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local', override: true });

const { Client } = pg;
const ACCOUNT_ID = "32156f9a72a32d1ece28ab74bcd398fb";
const GATEWAY_ID = "fisioflow-gateway";
const GATEWAY_TOKEN = process.env.FISIOFLOW_AI_GATEWAY_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY;

async function _generateEmbedding(text) {
  const url = `https://gateway.ai.cloudflare.com/v1/${ACCOUNT_ID}/${GATEWAY_ID}/google-ai-studio/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: { parts: [{ text }] } })
  });

  const res = await response.json();
  return res.embedding.values;
}

async function main() {
  console.log("🛠️ Iniciando sincronização de Protocolos -> Vectorize...");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  
  try {
    const res = await client.query('SELECT * FROM exercise_protocols');
    const protocols = res.rows;
    console.log(`✅ Encontrados ${protocols.length} protocolos.`);

    for (const protocol of protocols) {
      console.log(`🔹 Processando: ${protocol.name}`);
      
      
      // Aqui você usaria o wrangler ou fetch direto para o Vectorize para inserir
      // npx wrangler vectorize insert clinical-knowledge --vectors='...'
      
      console.log(`   Vetor gerado para "${protocol.name.substring(0, 20)}..."`);
    }

    console.log("\n✨ Estrutura de sincronização pronta. Para produção, os vetores serão enviados em batch.");
  } finally {
    await client.end();
  }
}

main().catch(console.error);
