/**
 * Upload new exercise illustration images to Cloudflare R2
 * and sync the image_url in the Neon database.
 *
 * Supports .avif, .png, .jpg, .webp
 * Uses wrangler r2 object put for upload.
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

const ILLUSTRATIONS_DIR = path.join(
  __dirname,
  "../android/app/src/main/assets/public/exercises/illustrations"
);

const BUCKET_NAME = "fisioflow-media";
const R2_PREFIX = "exercises/illustrations";
const R2_PUBLIC_BASE = "https://media.moocafisio.com.br";

// Imagens novas geradas nesta sessão (slugs sem extensão)
const NEW_IMAGES = [
  { file: "agachamento-v2.png", slug: "agachamento", name: "Agachamento" },
  { file: "crunch.png", slug: "crunch", name: "Abdominal Crunch" },
  { file: "quatro-apoios.png", slug: "quatro-apoios", name: "Quatro Apoios" },
  { file: "leg-raise-lateral.png", slug: "leg-raise-lateral", name: "Abdução de Quadril Deitado" },
  { file: "agachamento-sumo-v2.png", slug: "agachamento-sumo-v2", name: "Agachamento Sumô" },
  { file: "along-quadriceps.png", slug: "along-quadriceps", name: "Alongamento de Quadríceps" },
];

async function uploadAndSync() {
  const sql = neon(DATABASE_URL);

  console.log("🚀 Iniciando upload para R2 + sync no banco...\n");

  let uploadOk = 0;
  let dbOk = 0;
  let errors = 0;

  for (const img of NEW_IMAGES) {
    const filePath = path.join(ILLUSTRATIONS_DIR, img.file);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Arquivo não encontrado: ${filePath}`);
      errors++;
      continue;
    }

    const r2Key = `${R2_PREFIX}/${img.file}`;
    const publicUrl = `${R2_PUBLIC_BASE}/${r2Key}`;

    // 1. Upload para R2 via wrangler
    try {
      console.log(`📤 Enviando para R2: ${r2Key}`);
      execSync(
        `npx wrangler r2 object put ${BUCKET_NAME}/${r2Key} --file "${filePath}" --content-type "image/png"`,
        { cwd: path.join(__dirname, ".."), stdio: "pipe" }
      );
      console.log(`   ✅ Upload OK → ${publicUrl}`);
      uploadOk++;
    } catch (err) {
      console.error(`   ❌ Erro no upload: ${err.message?.slice(0, 200)}`);
      errors++;
      continue;
    }

    // 2. Atualizar banco pelo slug (tenta variações comuns)
    const slugVariants = [
      img.slug,
      `exd-${img.slug}`,
      img.slug.replace(/-v2$/, ""),
      `exd-${img.slug.replace(/-v2$/, "")}`,
    ];

    let updated = false;
    for (const slug of slugVariants) {
      const res = await sql`
        UPDATE exercises
        SET image_url = ${publicUrl}, thumbnail_url = ${publicUrl}
        WHERE slug = ${slug}
        RETURNING name, slug
      `;
      if (res.length > 0) {
        console.log(`   🗄️  DB atualizado: ${res[0].name} (slug: ${res[0].slug})`);
        dbOk++;
        updated = true;
        break;
      }
    }

    if (!updated) {
      // Tenta por nome
      const res = await sql`
        UPDATE exercises
        SET image_url = ${publicUrl}, thumbnail_url = ${publicUrl}
        WHERE LOWER(name) = LOWER(${img.name})
        RETURNING name, slug
      `;
      if (res.length > 0) {
        console.log(`   🗄️  DB atualizado por nome: ${res[0].name} (slug: ${res[0].slug})`);
        dbOk++;
      } else {
        console.warn(`   ⚠️  Exercício não encontrado no DB: ${img.name} (slug: ${img.slug})`);
      }
    }

    console.log();
  }

  console.log("═══════════════════════════════════");
  console.log(`📊 Resumo:`);
  console.log(`   ✅ Uploads R2:    ${uploadOk}/${NEW_IMAGES.length}`);
  console.log(`   🗄️  DB updates:   ${dbOk}/${NEW_IMAGES.length}`);
  console.log(`   ❌ Erros:         ${errors}`);
  console.log("═══════════════════════════════════");
}

uploadAndSync().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
