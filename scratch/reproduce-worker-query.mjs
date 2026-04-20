import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const baseSql = neon(url, { fullResults: true });

async function reproduce() {
  const orgId = '04f4477c-7833-4f96-8571-33157940787e'; // Default from lib/db.ts
  
  const queryText = `
    SELECT 
      "exercises"."id", "exercises"."slug", "exercises"."name", "exercises"."category_id", "exercise_categories"."name" as "categoryName", 
      "exercises"."difficulty", "exercises"."image_url", "exercises"."thumbnail_url", "exercises"."video_url", 
      "exercises"."muscles_primary", "exercises"."body_parts", "exercises"."equipment", 
      "exercises"."duration_seconds", "exercises"."description", "exercises"."tags", 
      "exercises"."embedding_sketch", "exercises"."reference_pose" 
    FROM "exercises" 
    LEFT JOIN "exercise_categories" ON "exercises"."category_id" = "exercise_categories"."id" 
    WHERE ("exercises"."is_active" = true AND "exercises"."is_public" = true) 
    ORDER BY "exercises"."name" 
    LIMIT $1 OFFSET $2
  `;
  const queryParams = [500, 0];

  try {
    console.log("Executing transaction...");
    const results = await baseSql.transaction([
      baseSql.query(`SELECT set_config('app.org_id', $1, true)`, [orgId]),
      baseSql.query(queryText, queryParams),
    ]);
    
    const result = results[1];
    console.log(`Query success. Rows: ${result.rows?.length}`);
    
    // Check for any weird data in rows
    if (result.rows.length > 0) {
        const sample = result.rows[0];
        console.log("Sample row keys:", Object.keys(sample));
        // Check for fields that might cause issues
        const largeFields = Object.entries(sample).filter(([k, v]) => v && typeof v === 'string' && v.length > 1000);
        if (largeFields.length > 0) {
            console.log("Large fields found:", largeFields.map(([k, v]) => `${k} (${v.length} chars)`));
        }
    }

    console.log("Executing count query...");
    const countResults = await baseSql.transaction([
      baseSql.query(`SELECT set_config('app.org_id', $1, true)`, [orgId]),
      baseSql.query(`SELECT count(*) FROM "exercises" LEFT JOIN "exercise_categories" ON "exercises"."category_id" = "exercise_categories"."id" WHERE ("exercises"."is_active" = true AND "exercises"."is_public" = true)`, []),
    ]);
    console.log("Count result:", countResults[1].rows[0]);

  } catch (err) {
    console.error("Error:", err.message);
    if (err.stack) console.error(err.stack);
  }
}

reproduce();
