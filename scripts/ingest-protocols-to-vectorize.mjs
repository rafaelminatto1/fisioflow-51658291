/**
 * Ingest Protocols to Cloudflare Vectorize
 *
 * Este script pega os protocolos existentes no banco Neon e gera
 * embeddings vetoriais para busca semântica (RAG) no Cloudflare Vectorize.
 */

import "dotenv/config";
import { Client } from "pg";

// Configurações Cloudflare
const CF_ACCOUNT_ID = "32156f9a72a32d1ece28ab74bcd398fb";
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const VECTOR_INDEX_NAME = "clinical-knowledge";

async function generateEmbedding(text) {
  // Modelo Base gera 768 dimensões (compatível com o índice clinical-knowledge atual)
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-base-en-v1.5`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: [text] }),
  });

  const result = await response.json();
  if (result.success) {
    return result.result.data[0]; // Retorna o vetor (embedding)
  }
  throw new Error(`Erro ao gerar embedding: ${JSON.stringify(result.errors)}`);
}

async function upsertToVectorize(vectors) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/vectorize/v2/indexes/${VECTOR_INDEX_NAME}/upsert`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/x-ndjson", // Vectorize usa NDJSON para bulk upsert
    },
    body: vectors.map((v) => JSON.stringify(v)).join("\n"),
  });

  const result = await response.json();
  return result;
}

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🔌 Conectando ao Banco Neon...");
    await client.connect();

    console.log("🔍 Buscando protocolos clínicos...");
    const res = await client.query(
      "SELECT id, name, description, objectives FROM exercise_protocols WHERE is_active = true",
    );

    console.log(`📑 Processando ${res.rows.length} protocolos...`);

    const vectors = [];
    for (const row of res.rows) {
      const contentToEmbed = `${row.name}\n${row.description || ""}\nObjetivos: ${row.objectives || ""}`;

      process.stdout.write(`🧠 Gerando vetor para: ${row.name}... `);
      try {
        const values = await generateEmbedding(contentToEmbed);
        vectors.push({
          id: row.id,
          values: values,
          metadata: {
            name: row.name,
            type: "protocol",
          },
        });
        console.log("✅");
      } catch (e) {
        console.log("❌");
        console.error(e.message);
      }
    }

    if (vectors.length > 0) {
      console.log(`📤 Enviando ${vectors.length} vetores para o Cloudflare Vectorize...`);
      const result = await upsertToVectorize(vectors);
      console.log("✨ Sucesso!", result);
    }
  } catch (err) {
    console.error("💥 Erro fatal:", err);
  } finally {
    await client.end();
  }
}

run();
