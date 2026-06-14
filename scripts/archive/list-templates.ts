import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates } from "../src/server/db/schema/templates";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = neon(connectionString);
  const db = drizzle(sql);

  const templates = await db.select().from(exerciseTemplates);
  console.log(JSON.stringify(templates, null, 2));
}
main().catch(console.error);
