/**
 * Migrate old exercises images from /public/images/exercises/
 * to Cloudflare R2 and update the database to point to the R2 CDN.
 */

require("dotenv").config({ path: ".env.local" });

const { execSync } = require("child_process");
const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrada em .env.local");
  process.exit(1);
}

const OLD_IMAGES_DIR = path.join(__dirname, "../public/images/exercises");
const BUCKET_NAME = "fisioflow-media";
const R2_PREFIX = "exercises/illustrations";
const R2_PUBLIC_BASE = "https://media.moocafisio.com.br";

async function runMigration() {
  const sql = neon(DATABASE_URL);

  console.log("🚀 Iniciando migração das imagens antigas para o R2...\n");

  // Buscar todos os exercícios cuja imagem começa com /images/exercises/
  const exercises = await sql`
    SELECT id, name, slug, image_url
    FROM exercises
    WHERE is_active = true
      AND (image_url LIKE '/images/exercises/%' OR image_url LIKE 'images/exercises/%')
  `;

  console.log(`📋 Encontrados ${exercises.length} exercícios para migrar.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const ex of exercises) {
    const filename = path.basename(ex.image_url);
    const localPath = path.join(OLD_IMAGES_DIR, filename);

    if (!fs.existsSync(localPath)) {
      console.warn(`⚠️  Arquivo local não encontrado: ${localPath} para o exercício: "${ex.name}"`);
      errorCount++;
      continue;
    }

    const r2Key = `${R2_PREFIX}/${filename}`;
    const publicUrl = `${R2_PUBLIC_BASE}/${r2Key}`;

    // 1. Upload para R2 via wrangler
    try {
      console.log(`📤 Enviando para R2: ${r2Key} (${ex.name})`);
      execSync(
        `npx wrangler r2 object put ${BUCKET_NAME}/${r2Key} --file "${localPath}" --content-type "image/png"`,
        { cwd: path.join(__dirname, ".."), stdio: "pipe" },
      );
      console.log(`   ✅ Upload OK`);
    } catch (err) {
      console.error(`   ❌ Erro no upload: ${err.message?.slice(0, 200)}`);
      errorCount++;
      continue;
    }

    // 2. Atualizar banco
    try {
      await sql`
        UPDATE exercises
        SET image_url = ${publicUrl}, thumbnail_url = ${publicUrl}, updated_at = NOW()
        WHERE id = ${ex.id}
      `;
      console.log(`   🗄️  DB atualizado: "${ex.name}" -> ${publicUrl}\n`);
      successCount++;
    } catch (err) {
      console.error(`   ❌ Erro no DB: ${err.message}`);
      errorCount++;
    }
  }

  console.log("═══════════════════════════════════");
  console.log(`📊 Resumo da Migração:`);
  console.log(`   ✅ Sucessos:  ${successCount}/${exercises.length}`);
  console.log(`   ❌ Erros:     ${errorCount}`);
  console.log("═══════════════════════════════════");
}

runMigration().catch((err) => {
  console.error("❌ Erro fatal na migração:", err);
  process.exit(1);
});
