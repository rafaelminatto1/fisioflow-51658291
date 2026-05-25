import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = 'postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(databaseUrl);

async function main() {
  console.log("Reading migration SQL...");
  const sqlPath = path.join(__dirname, "../apps/api/migrations/0100_fix_capacity_and_hyphenated_rls_policies.sql");
  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  console.log("Connecting to production database and running migration...");
  
  try {
    // Corrected to use sql.query for conventional function call
    const res = await sql.query(rawSql);
    console.log("✅ Migration executed successfully on production database!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
