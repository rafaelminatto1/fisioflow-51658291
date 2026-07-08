import { Client } from "pg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { builtinClinicalTestsCatalog } from "../../src/data/clinicalTestsCatalog";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in the environment.");
  process.exit(1);
}

const ILLUSTRATIONS_DIR = path.join(__dirname, "../public/clinical-tests/illustrations");
const BUCKET_NAME = "fisioflow-media";
const R2_PREFIX = "clinical-tests/illustrations";
const R2_PUBLIC_BASE = "https://media.moocafisio.com.br";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("🚀 Connected to Neon DB.");
    console.log(
      `📂 Scanning clinical tests in catalog: ${builtinClinicalTestsCatalog.length} found.`,
    );

    let uploadOk = 0;
    let dbUpdates = 0;
    let dbInserts = 0;
    let errors = 0;

    // 1. Get existing clinical tests from database
    const dbRes = await client.query("SELECT id, name FROM clinical_test_templates");
    const dbTests = dbRes.rows;

    for (const test of builtinClinicalTestsCatalog) {
      console.log(`\n🔹 Processing: "${test.name}"`);

      // Determine the illustration file name
      let imageUrl = null;
      if (test.image_url) {
        const baseFile = path.basename(test.image_url);
        const localPath = path.join(ILLUSTRATIONS_DIR, baseFile);

        if (fs.existsSync(localPath)) {
          const r2Key = `${R2_PREFIX}/${baseFile}`;
          const publicUrl = `${R2_PUBLIC_BASE}/${r2Key}`;

          try {
            console.log(`   📤 Uploading ${baseFile} to R2...`);
            execSync(
              `npx wrangler r2 object put ${BUCKET_NAME}/${r2Key} --file "${localPath}" --content-type "image/avif" --remote`,
              { cwd: path.join(__dirname, ".."), stdio: "pipe" },
            );
            console.log(`   ✅ Upload OK -> ${publicUrl}`);
            imageUrl = publicUrl;
            uploadOk++;
          } catch (err: any) {
            console.error(`   ❌ R2 Upload Failed: ${err.message?.slice(0, 150)}`);
            errors++;
          }
        } else {
          console.warn(`   ⚠️ Local illustration not found: ${localPath}`);
        }
      }

      // Check if test exists in the database.
      // Match by exact name, or by normalized name comparison.
      const normalizedCatName = normalizeName(test.name);
      const matched = dbTests.find(
        (dbTest) =>
          normalizeName(dbTest.name) === normalizedCatName ||
          normalizedCatName.includes(normalizeName(dbTest.name)) ||
          normalizeName(dbTest.name).includes(normalizedCatName),
      );

      const fieldsDefinition = test.fieldsDefinition ? JSON.stringify(test.fieldsDefinition) : "[]";
      const tags = test.tags || [];

      if (matched) {
        // Update existing test
        console.log(`   🗄️ Matching test in DB: "${matched.name}" (ID: ${matched.id})`);
        const query = `
          UPDATE clinical_test_templates
          SET name = $1,
              category = $2,
              target_joint = $3,
              purpose = $4,
              execution = $5,
              positive_sign = $6,
              reference = $7,
              sensitivity_specificity = $8,
              tags = $9,
              type = $10,
              fields_definition = $11,
              regularity_sessions = $12,
              layout_type = $13,
              image_url = COALESCE($14, image_url),
              updated_at = NOW()
          WHERE id = $15
        `;
        const values = [
          test.name,
          test.category,
          test.target_joint,
          test.purpose,
          test.execution,
          test.positive_sign || null,
          test.reference || null,
          test.sensitivity_specificity || null,
          tags,
          test.type || "special_test",
          fieldsDefinition,
          test.regularity_sessions || null,
          test.layout_type || null,
          imageUrl,
          matched.id,
        ];

        await client.query(query, values);
        console.log("   ✅ Database Updated.");
        dbUpdates++;
      } else {
        // Insert new test
        console.log(`   🗄️ No matching test. Inserting as new test.`);
        const query = `
          INSERT INTO clinical_test_templates (
            name, category, target_joint, purpose, execution, positive_sign,
            reference, sensitivity_specificity, tags, type, fields_definition,
            regularity_sessions, layout_type, image_url, is_custom, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false, NOW(), NOW())
        `;
        const values = [
          test.name,
          test.category,
          test.target_joint,
          test.purpose,
          test.execution,
          test.positive_sign || null,
          test.reference || null,
          test.sensitivity_specificity || null,
          tags,
          test.type || "special_test",
          fieldsDefinition,
          test.regularity_sessions || null,
          test.layout_type || null,
          imageUrl,
        ];

        await client.query(query, values);
        console.log("   ✅ Database Inserted.");
        dbInserts++;
      }
    }

    console.log("\n═══════════════════════════════════");
    console.log(`📊 Sync Summary:`);
    console.log(`   ✅ R2 Uploads:     ${uploadOk}`);
    console.log(`   ✅ DB Updates:     ${dbUpdates}`);
    console.log(`   ✅ DB Inserts:     ${dbInserts}`);
    console.log(`   ❌ Errors:         ${errors}`);
    console.log("═══════════════════════════════════");
  } catch (err) {
    console.error("❌ Fatal Error:", err);
  } finally {
    await client.end();
  }
}

run();
