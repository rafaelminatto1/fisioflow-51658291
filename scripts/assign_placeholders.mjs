import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
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
