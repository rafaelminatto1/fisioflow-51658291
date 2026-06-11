import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function checkPlaceholders() {
  const result = await sql`
    SELECT count(*) FROM exercises WHERE image_url LIKE '%placeholder%'
  `;
  console.log(`Faltam ${result[0].count} exercícios usando placeholders.`);
}

checkPlaceholders().catch(console.error).finally(() => process.exit(0));
