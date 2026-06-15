import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function run() {
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_piriforme.png' WHERE slug = 'alongamento-de-piriforme'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_borboleta.png' WHERE slug = 'alongamento-de-adutores-borboleta'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_adutores_lateral.png' WHERE slug = 'alongamento-de-adutores-lateral'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_cat_cow.png' WHERE slug = 'alongamento-de-gato-camelo-cat-cow'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_cobra.png' WHERE slug = 'alongamento-de-extensao-lombar-cobra'`;
  console.log("Lote 2 atualizado com sucesso no banco!");
}

run()
  .catch(console.error)
  .finally(() => process.exit(0));
