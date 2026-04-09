import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { exercises } from './src/server/db/schema/exercises.ts';
import { isNull, or } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log('Fetching exercises missing thumbnails...');

  const missing = await db.select({
    id: exercises.id,
    name: exercises.name,
    description: exercises.description,
    slug: exercises.slug,
    bodyParts: exercises.bodyParts,
  })
  .from(exercises)
  .where(or(isNull(exercises.thumbnailUrl), isNull(exercises.imageUrl)));

  console.log(`Found ${missing.length} exercises missing thumbnails.`);

  fs.writeFileSync('tmp/missing_exercises.json', JSON.stringify(missing, null, 2));
  console.log('List saved to tmp/missing_exercises.json');

  missing.slice(0, 10).forEach(ex => {
    console.log(`- ${ex.name} (Slug: ${ex.slug})`);
  });
}

main().catch(console.error);
