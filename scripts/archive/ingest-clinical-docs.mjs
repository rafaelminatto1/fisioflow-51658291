import "./load-cloudflare-env.mjs";
import { readFileSync, readdirSync } from "node:fs";
import { join, extname, basename } from "node:path";

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "32156f9a72a32d1ece28ab74bcd398fb";
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const VECTOR_INDEX_NAME = "fisioflow-clinical";

if (!CF_API_TOKEN) {
  console.error("❌ Erro: CLOUDFLARE_API_TOKEN não está definido no ambiente.");
  process.exit(1);
}

async function generateEmbedding(text) {
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
    return result.result.data[0];
  }
  throw new Error(`Erro ao gerar embedding: ${JSON.stringify(result.errors)}`);
}

async function upsertToVectorize(vectors) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/vectorize/v2/indexes/${VECTOR_INDEX_NAME}/upsert`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/x-ndjson",
    },
    body: vectors.map((v) => JSON.stringify(v)).join("\n"),
  });

  const result = await response.json();
  return result;
}

function chunkText(text, maxLength = 1000) {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

async function main() {
  console.log("🧠 Iniciando ingestão robusta de documentos clínicos...");

  const docsDir = "./clinical_docs";
  let files;
  try {
    files = readdirSync(docsDir);
  } catch (err) {
    console.error(`❌ Erro ao ler diretório ${docsDir}:`, err.message);
    return;
  }

  const validFiles = files.filter((f) => {
    const ext = extname(f).toLowerCase();
    return ext === ".txt" || ext === ".md";
  });

  const pdfFiles = files.filter((f) => extname(f).toLowerCase() === ".pdf");
  if (pdfFiles.length > 0) {
    console.log(`\n⚠️ Encontrados ${pdfFiles.length} arquivos PDF. Para processá-los:`);
    console.log("   Converta-os para .txt ou instale uma biblioteca como `pdf-parse`.");
    console.log("   Arquivos PDF ignorados por enquanto.\n");
  }

  if (validFiles.length === 0) {
    console.log("ℹ️ Nenhum arquivo .txt ou .md encontrado para processar.");
    return;
  }

  console.log(`📑 Encontrados ${validFiles.length} arquivos válidos para processamento.`);

  for (const file of validFiles) {
    const filePath = join(docsDir, file);
    console.log(`\n📄 Processando: ${file}...`);

    const text = readFileSync(filePath, "utf-8");
    const chunks = chunkText(text);
    console.log(`   Quebrado em ${chunks.length} pedaços.`);

    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      process.stdout.write(`   🧠 Gerando vetor para pedaço ${i + 1}/${chunks.length}... `);

      try {
        const values = await generateEmbedding(chunk);
        vectors.push({
          id: `${basename(file, extname(file))}-chunk-${i}`,
          values: values,
          metadata: {
            filename: file,
            text: chunk.substring(0, 500), // Armazenar o texto (ou parte dele) no metadado para referência
            type: "clinical-doc",
          },
        });
        console.log("✅");
      } catch (e) {
        console.log("❌");
        console.error(`   Erro: ${e.message}`);
      }
    }

    if (vectors.length > 0) {
      console.log(`   📤 Enviando ${vectors.length} vetores para o Cloudflare Vectorize...`);
      try {
        const result = await upsertToVectorize(vectors);
        if (result.success) {
          console.log("   ✨ Sucesso!");
        } else {
          console.error("   ❌ Erro no Vectorize:", JSON.stringify(result.errors));
        }
      } catch (e) {
        console.error("   ❌ Erro ao enviar para o Vectorize:", e.message);
      }
    }
  }
}

main().catch(console.error);
