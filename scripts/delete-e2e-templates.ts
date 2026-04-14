import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates, exerciseTemplateItems } from "../src/server/db/schema/templates";
import { ilike } from "drizzle-orm";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Deleting E2E templates...");
  const e2eTemplates = await db.select().from(exerciseTemplates).where(ilike(exerciseTemplates.name, "%E2E Template%"));
  
  if (e2eTemplates.length === 0) {
    console.log("No E2E templates found.");
    process.exit(0);
  }

  console.log(`Found ${e2eTemplates.length} E2E templates. Deleting...`);
  for (const t of e2eTemplates) {
    await db.delete(exerciseTemplateItems).where(ilike(exerciseTemplateItems.templateId, t.id));
    await db.delete(exerciseTemplates).where(ilike(exerciseTemplates.id, t.id));
  }
  console.log("Done.");
  process.exit(0);
}
main();