const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TARGET_DIR = "public/exercises/illustrations/";

const batch = [
  {
    suffix: "alongamento_quadriceps_toalha_illustration_batch3_1775779655743_1775850870854.png",
    slug: "alongamento-de-quadriceps-com-toalha",
    id: "421c4354-9ee0-4963-9585-703666d9feea",
  },
  {
    suffix: "alongamento_romboides_parede_illustration_batch3_1775779655744_1775850885307.png",
    slug: "alongamento-de-romboides-na-parede",
    id: "de7387b3-c466-419b-a3be-673ebf19747d",
  },
  {
    suffix: "alongamento_soleo_parede_illustration_batch3_1775779655745_1775850899358.png",
    slug: "alongamento-de-soleo-na-parede",
    id: "79be3468-b765-4d2c-87d4-f65581179e83",
  },
  {
    suffix: "alongamento_triceps_tras_illustration_batch3_1775779655746_1775850914080.png",
    slug: "alongamento-de-triceps-por-tras",
    id: "ee1c5483-207d-41a4-9640-59baef01584e",
  },
  {
    suffix: "apoio_unipodal_illustration_batch3_1775779655747_1775850926407.png",
    slug: "apoio-unipodal",
    id: "40ba1179-c567-4638-a128-4ce6883ced97",
  },
  {
    suffix: "apoio_unipodal_olhos_fechados_illustration_batch3_1775779655748_1775850940874.png",
    slug: "apoio-unipodal-olhos-fechados",
    id: "77a66fbc-6192-42da-9ffb-5b23d9a13993",
  },
  {
    suffix: "bosu_ball_squat_illustration_batch3_1775779655749_1775850957414.png",
    slug: "bosu-ball-squat",
    id: "e3ce6174-8846-4cb2-830a-9d066967406a",
  },
];

const SOURCE_DIR = "/home/rafael/.gemini/antigravity/brain/655072bd-9231-456b-8d0b-b49767e6aa17/";

async function run() {
  try {
    await client.connect();
    console.log("🚀 Starting import of Batch 3 (partial)...");

    for (const item of batch) {
      const sourcePath = path.join(SOURCE_DIR, item.suffix);
      const targetFilename = `${item.slug}.avif`;
      const targetPath = path.join(TARGET_DIR, targetFilename);

      if (!fs.existsSync(sourcePath)) {
        console.warn(`⚠️ Source not found: ${sourcePath}`);
        continue;
      }

      console.log(`Processing: ${item.slug}...`);
      await sharp(sourcePath).avif({ quality: 60 }).toFile(targetPath);

      const dbUrl = `/exercises/illustrations/${targetFilename}`;
      await client.query("UPDATE exercises SET image_url = $1, thumbnail_url = $1 WHERE id = $2", [
        dbUrl,
        item.id,
      ]);
      console.log(`✅ Success: ${item.slug} -> ${targetFilename}`);
    }

    console.log("✨ Batch 3 (partial) import complete.");
  } catch (err) {
    console.error("❌ Error during import:", err);
  } finally {
    await client.end();
  }
}

run();
