import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates } from "../src/server/db/schema/templates";

async function main() {
  const connectionString = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
  const sql = neon(connectionString);
  const db = drizzle(sql);

  const templates = await db.select().from(exerciseTemplates);
  console.log(JSON.stringify(templates, null, 2));
}
main().catch(console.error);
