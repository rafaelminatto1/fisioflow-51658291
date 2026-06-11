import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function run() {
  console.log("Atribuindo placeholders para exercícios sem imagem...");
  
  // Atualiza mobilidade
  const resMob = await sql`
    UPDATE exercises 
    SET image_url = '/images/exercises/placeholder_mobilidade.png'
    WHERE image_url IS NULL AND (slug ILIKE '%mobilidade%' OR name ILIKE '%mobilidade%')
  `;
  
  // Atualiza alongamento (o que sobrar com alongamento ou o resto)
  const resAlo = await sql`
    UPDATE exercises 
    SET image_url = '/images/exercises/placeholder_alongamento.png'
    WHERE image_url IS NULL
  `;

  console.log(`✅ Placeholders atribuídos com sucesso!`);
}

run().catch(console.error).finally(() => process.exit(0));
