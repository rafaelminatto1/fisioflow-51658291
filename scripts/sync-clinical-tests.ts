import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/server/db/schema/clinical";
import { builtinClinicalTestsCatalog } from "../src/data/clinicalTestsCatalog";
import { eq, sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = neon(connectionString);
  const db = drizzle(client, { schema });

  console.log(`Syncing ${builtinClinicalTestsCatalog.length} clinical tests...`);

  for (const test of builtinClinicalTestsCatalog) {
    const data = {
      name: test.name,
      nameEn: test.name_en,
      category: test.category,
      targetJoint: test.target_joint,
      purpose: test.purpose,
      execution: test.execution,
      positiveSign: test.positive_sign,
      reference: test.reference,
      sensitivitySpecificity: test.sensitivity_specificity,
      tags: test.tags || [],
      type: test.type || "special_test",
      imageUrl: test.imageUrl,
      initialPositionImageUrl: test.initialPositionImageUrl,
      finalPositionImageUrl: test.finalPositionImageUrl,
      regularitySessions: test.regularity_sessions,
      layoutType: test.layout_type,
      isCustom: false,
      updatedAt: new Date(),
    };

    // Try to find existing by name (normalized)
    const existing = await db.query.clinicalTestTemplates.findFirst({
      where: (table, { eq }) => eq(table.name, test.name),
    });

    if (existing) {
      console.log(`Updating: ${test.name}`);
      await db
        .update(schema.clinicalTestTemplates)
        .set(data)
        .where(eq(schema.clinicalTestTemplates.id, existing.id));
    } else {
      console.log(`Creating: ${test.name}`);
      await db.insert(schema.clinicalTestTemplates).values({
        ...data,
        createdAt: new Date(),
      });
    }
  }

  console.log("Sync completed successfully!");
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
