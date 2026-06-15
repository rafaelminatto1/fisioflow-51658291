import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function checkPlaceholders() {
  const result = await sql`
    SELECT count(*) FROM exercises WHERE image_url LIKE '%placeholder%'
  `;
  console.log(`Faltam ${result[0].count} exercícios usando placeholders.`);
}

checkPlaceholders()
  .catch(console.error)
  .finally(() => process.exit(0));
