const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// DATABASE_URL deve ser exportada no terminal
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TARGET_DIR = "public/exercises/illustrations/";
const SOURCE_DIR = "/home/rafael/.gemini/antigravity/brain/2902e7c3-b382-4156-bd01-f7ac96229515/";

// Lista de exercícios para o Batch 6
// O 'suffix' deve ser preenchido com o nome do arquivo PNG gerado pela IA (ou manualmente)
const batch = [
  {
    slug: "alongamento-de-gluteo-sentado",
    suffix: "alongamento_gluteo_sentado_batch6_1776250893558.png",
  },
  { slug: "desenvolvimento-de-ombro", suffix: "" },
  { slug: "elevacao-pelvica-unilateral", suffix: "" },
  { slug: "elevacao-de-escapula", suffix: "" },
  { slug: "elevacao-de-perna-estendida", suffix: "" },
  { slug: "encolhimento-de-ombros", suffix: "" },
  { slug: "equilibrio-na-ponta-dos-pes", suffix: "" },
  { slug: "equilibrio-unipodal-solo", suffix: "" },
  { slug: "espirometria-incentivada", suffix: "" },
  { slug: "eversao-de-tornozelo-com-faixa", suffix: "" },
  { slug: "exercicio-de-parede-para-ombro", suffix: "" },
  { slug: "expansao-toracica-unilateral", suffix: "" },
  { slug: "extensao-de-cotovelo-triceps", suffix: "" },
  { slug: "extensao-de-cotovelo-com-garrafa", suffix: "" },
  { slug: "extensao-de-dedos", suffix: "" },
];

async function run() {
  try {
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    await client.connect();
    console.log(`🚀 Starting import of Batch 6 (${batch.length} exercises)...`);

    for (const item of batch) {
      if (!item.suffix) {
        console.warn(`⏭️ Skipping ${item.slug}: No source filename (suffix) provided.`);
        continue;
      }

      const sourcePath = path.join(SOURCE_DIR, item.suffix);
      const targetFilename = `${item.slug}.avif`;
      const targetPath = path.join(TARGET_DIR, targetFilename);

      if (!fs.existsSync(sourcePath)) {
        console.warn(`⚠️ Source not found: ${sourcePath}`);
        continue;
      }

      console.log(`Processing: ${item.slug}...`);

      // Conversão para AVIF otimizado
      await sharp(sourcePath).resize(800).avif({ quality: 60 }).toFile(targetPath);

      // Atualização no Banco de Dados
      const res = await client.query("SELECT id FROM exercises WHERE slug = $1 LIMIT 1", [
        item.slug,
      ]);

      if (res.rows.length > 0) {
        const id = res.rows[0].id;
        const dbUrl = `/exercises/illustrations/${targetFilename}`;
        await client.query(
          "UPDATE exercises SET image_url = $1, thumbnail_url = $1, updated_at = NOW() WHERE id = $2",
          [dbUrl, id],
        );
        console.log(`✅ Success: ${item.slug} mapped to ID ${id}`);
      } else {
        console.warn(`❌ Could not find exercise with slug: ${item.slug}`);
      }
    }

    console.log("✨ Batch 6 import attempt finished.");
  } catch (err) {
    console.error("❌ Error during import:", err);
  } finally {
    await client.end();
  }
}

run();
