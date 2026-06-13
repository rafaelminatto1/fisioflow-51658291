import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(databaseUrl);

async function main() {
  console.log("Reading migration SQL...");
  const sqlPath = path.join(__dirname, "../apps/api/migrations/0100_fix_capacity_and_hyphenated_rls_policies.sql");
  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  console.log("Connecting to production database and running migration...");
  
  try {
    // Corrected to use sql.query for conventional function call
    await sql.query(rawSql);
    console.log("✅ Migration executed successfully on production database!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
