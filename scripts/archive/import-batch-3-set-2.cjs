const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TARGET_DIR = "public/exercises/illustrations/";
const SOURCE_DIR = "/home/rafael/.gemini/antigravity/brain/655072bd-9231-456b-8d0b-b49767e6aa17/";

const batch = [
  {
    suffix: "bird_dog_illustration_batch3_v2_1775779655750_retry_1775872310257.png",
    slug: "bird-dog-cachorro-e-passaro",
  },
  { suffix: "box_jump_illustration_batch3_v2_1775779655751_1775872394234.png", slug: "box-jump" },
  {
    suffix: "boxe_sombra_illustration_batch3_v2_1775779655752_1775872410598.png",
    slug: "boxe-de-sombra-shadow-boxing",
  },
  {
    suffix: "burpee_modificado_illustration_batch3_1775779655753_1775872426776.png",
    slug: "burpee-modificado",
  },
  {
    suffix: "chin_tuck_elevacao_head_lift_illustration_batch3_1775779655754_1775872438575.png",
    slug: "chin-tuck-com-elevacao-head-lift",
  },
  {
    suffix: "caminhada_calcanhar_illustration_batch3_1775779655755_1775872452961.png",
    slug: "caminhada-de-calcanhar",
  },
  {
    suffix: "caminhada_ponta_pe_illustration_batch3_1775779655756_1775872464237.png",
    slug: "caminhada-de-ponta-de-pe",
  },
  {
    suffix: "caminhada_lateral_miniband_illustration_batch3_1775779655757_1775872481699.png",
    slug: "caminhada-de-lado-com-miniband-lateral-band-walk",
  },
  {
    suffix: "caminhada_maos_inchworm_illustration_batch3_1775779655758_1775872494792.png",
    slug: "caminhada-com-as-maos-inchworm",
  },
  {
    suffix: "canivete_vup_illustration_batch3_1775779655759_1775872507299.png",
    slug: "canivete-v-up",
  },
  {
    suffix: "cat_cow_illustration_batch3_1775779655760_1775872521950.png",
    slug: "cat-cow-gato-camelo",
  },
];

async function run() {
  try {
    await client.connect();
    console.log("🚀 Starting import of Batch 3 Set 2 (11 images)...");

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

      // Find ID dynamically
      const res = await client.query(
        "SELECT id FROM exercises WHERE slug = $1 OR slug LIKE $2 LIMIT 1",
        [item.slug, `%${item.slug}%`],
      );

      if (res.rows.length > 0) {
        const id = res.rows[0].id;
        const dbUrl = `/exercises/illustrations/${targetFilename}`;
        await client.query(
          "UPDATE exercises SET image_url = $1, thumbnail_url = $1 WHERE id = $2",
          [dbUrl, id],
        );
        console.log(`✅ Success: ${item.slug} mapped to ID ${id}`);
      } else {
        console.warn(`❌ Could not find exercise with slug like: ${item.slug}`);
      }
    }

    console.log("✨ Batch 3 Set 2 import complete.");
  } catch (err) {
    console.error("❌ Error during import:", err);
  } finally {
    await client.end();
  }
}

run();
