import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../packages/db/src/schema/index.ts";
import { eq, and, sql } from "drizzle-orm";
import {
  exercises,
  exerciseCategories,
  exerciseFavorites,
} from "../packages/db/src/schema/exercises.ts";

config({ path: "./apps/api/.env.production" });
config({ path: "./apps/api/.env" });

const sql_neon = neon(process.env.NEON_URL || process.env.DATABASE_URL);
const db = drizzle(sql_neon, { schema });

async function run() {
  try {
    const limitNum = 500;
    const offset = 0;
    const conditions = [eq(exercises.isActive, true), eq(exercises.isPublic, true)];
    const where = and(...conditions);

    console.log("Running query...");
    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: exercises.id,
          slug: exercises.slug,
          name: exercises.name,
          categoryId: exercises.categoryId,
          categoryName: exerciseCategories.name,
          difficulty: exercises.difficulty,
          imageUrl: exercises.imageUrl,
          thumbnailUrl: exercises.thumbnailUrl,
          videoUrl: exercises.videoUrl,
          musclesPrimary: exercises.musclesPrimary,
          bodyParts: exercises.bodyParts,
          equipment: exercises.equipment,
          durationSeconds: exercises.durationSeconds,
          description: exercises.description,
          tags: exercises.tags,
          embeddingSketch: exercises.embeddingSketch,
          referencePose: exercises.referencePose,
        })
        .from(exercises)
        .leftJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
        .where(where)
        .orderBy(exercises.name)
        .limit(limitNum)
        .offset(offset),
      db
        .select({ count: sql`count(*)` })
        .from(exercises)
        .leftJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
        .where(where),
    ]);
    console.log("Success! Rows:", rows.length, "Total:", countResult[0]?.count);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
