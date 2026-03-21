#!/usr/bin/env node

/**
 * ingest-clinical-docs.mjs
 * Processa PDFs/Textos e alimenta o cérebro vetorial da Cloudflare (Vectorize).
 */

import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

config({ path: '.env.local', override: true });

const ACCOUNT_ID = "32156f9a72a32d1ece28ab74bcd398fb";
const GATEWAY_ID = "fisioflow-gateway";
const GATEWAY_TOKEN = process.env.FISIOFLOW_AI_GATEWAY_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY;

async function generateEmbedding(text) {
  // Usando o AI Gateway para gerar o vetor (Embedding)
  const url = `https://gateway.ai.cloudflare.com/v1/${ACCOUNT_ID}/${GATEWAY_ID}/google-ai-studio/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
      'cf-aig-metadata': JSON.stringify({ source: 'ingestion-script', context: 'clinical-knowledge' })
    },
    body: JSON.stringify({
      content: { parts: [{ text }] }
    })
  });

  const res = await response.json();
  return res.embedding.values;
}

async function main() {
  const docsDir = resolve(process.cwd(), 'clinical_docs');
  console.log("🧠 Iniciando ingestão de conhecimento clínico...");

  // Exemplo de como você usará no terminal:
  // node scripts/ingest-clinical-docs.mjs --file protocolo_joelho.pdf --body_part joelho --type protocolo
  
  console.log("\n💡 Como usar este script:");
  console.log("1. Coloque seus PDFs na pasta /clinical_docs");
  console.log("2. O sistema quebrará o texto em parágrafos e gerará vetores via Cloudflare AI Gateway.");
  console.log("3. Os dados serão salvos no Vectorize index: 'clinical-knowledge'\n");

  console.log("⚠️ Aguardando arquivos na pasta /clinical_docs para processar...");
}

main().catch(console.error);
