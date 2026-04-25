const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const ILLUSTRATIONS_DIR = "public/exercises/illustrations/";

function normalizeForFuzzy(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-(da|de|do|e|com|para)-/g, "-")
    .replace(/[^\w]/g, "");
}

async function run() {
  try {
    await client.connect();

    const res = await client.query(
      "SELECT id, slug, name, image_url FROM exercises WHERE is_active = true",
    );
    const exercises = res.rows;

    const files = fs.readdirSync(ILLUSTRATIONS_DIR).filter((f) => f.endsWith(".avif"));

    console.log(
      `🔍 Deep Audit: Checking ${exercises.length} exercises against ${files.length} assets.`,
    );

    const suggestedMappings = [];

    for (const ex of exercises) {
      // Se já tem uma imagem que parece certa, pula
      if (ex.image_url && ex.image_url.includes(ex.slug)) continue;

      const normalizedEx = normalizeForFuzzy(ex.slug);
      const normalizedName = normalizeForFuzzy(ex.name);

      // Tenta achar um arquivo que contenha o nome do exercício ou vice-versa
      const match = files.find((f) => {
        const normalizedFile = normalizeForFuzzy(f.replace(".avif", ""));
        return (
          normalizedFile.includes(normalizedEx) ||
          normalizedEx.includes(normalizedFile) ||
          normalizedFile.includes(normalizedName) ||
          normalizedName.includes(normalizedFile)
        );
      });

      if (match) {
        suggestedMappings.push({
          name: ex.name,
          slug: ex.slug,
          current: ex.image_url,
          suggested: `/exercises/illustrations/${match}`,
          file: match,
        });
      }
    }

    if (suggestedMappings.length > 0) {
      console.log(`\n💡 FOUND ${suggestedMappings.length} POTENTIAL MATCHES:`);
      suggestedMappings.forEach((m, i) => {
        console.log(`${i + 1}. [${m.name}]`);
        console.log(`   Slug: ${m.slug}`);
        console.log(`   Current: ${m.current}`);
        console.log(`   Suggested: ${m.suggested}`);
        console.log("---");
      });
    } else {
      console.log("\n❌ No new fuzzy matches found.");
    }
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.end();
  }
}

run();
