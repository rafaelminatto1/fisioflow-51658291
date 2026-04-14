import { Pool } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const connectionString = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
  const pool = new Pool({ connectionString });

  const file = fs.readFileSync(path.join(process.cwd(), "drizzle/0004_demonic_yellow_claw.sql"), "utf-8");
  const statements = file.split("--> statement-breakpoint").filter(s => s.trim().length > 0);

  for (const stmt of statements) {
    console.log("Executing:", stmt.trim().slice(0, 50) + "...");
    try {
      await pool.query(stmt);
      console.log("Success.");
    } catch (err: any) {
      if (err.message.includes("already exists") || err.message.includes("DuplicateColumn") || err.message.includes("duplicate key")) {
        console.log("Skipping (already exists).");
      } else {
        console.error("Error executing statement:", err.message);
      }
    }
  }
  
  await pool.end();
}
main().catch(console.error);