const { Client } = require("pg");
const fs = require("fs");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const ILLUSTRATIONS_DIR = "public/exercises/illustrations/";

function normalizeForMatch(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-(da|de|do|e|com|para)-/g, "-")
    .replace(/-/g, "")
    .replace(/[^\w]/g, "");
}

async function run() {
  try {
    await client.connect();

    const res = await client.query("SELECT id, slug, name FROM exercises WHERE is_active = true");
    const exercises = res.rows;

    const files = fs.readdirSync(ILLUSTRATIONS_DIR).filter((f) => f.endsWith(".avif"));
    console.log(`🔍 Auditing ${exercises.length} exercises against ${files.length} local assets.`);

    let updatedCount = 0;
    let alreadyCorrect = 0;

    for (const ex of exercises) {
      const normalizedEx = normalizeForMatch(ex.slug);
      const match = files.find((f) => normalizeForMatch(f.replace(".avif", "")) === normalizedEx);

      if (match) {
        const relativePath = `/exercises/illustrations/${match}`;

        // Check if already correct
        const currentRes = await client.query("SELECT image_url FROM exercises WHERE id = $1", [
          ex.id,
        ]);
        if (currentRes.rows[0].image_url === relativePath) {
          alreadyCorrect++;
          continue;
        }

        console.log(`✅ Mapping detected: "${ex.name}" slug:${ex.slug} -> file:${match}`);
        await client.query(
          "UPDATE exercises SET image_url = $1, thumbnail_url = $1 WHERE id = $2",
          [relativePath, ex.id],
        );
        updatedCount++;
      }
    }

    console.log(`🎉 Summary:`);
    console.log(`   - Already Correct: ${alreadyCorrect}`);
    console.log(`   - Newly Mapped: ${updatedCount}`);
    console.log(`   - Total Mapped: ${alreadyCorrect + updatedCount}`);
    console.log(`   - Remaining: ${exercises.length - (alreadyCorrect + updatedCount)}`);
  } catch (err) {
    console.error("❌ Error mapping assets:", err);
  } finally {
    await client.end();
  }
}

run();
