import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function run() {
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_piriforme.png' WHERE slug = 'alongamento-de-piriforme'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_borboleta.png' WHERE slug = 'alongamento-de-adutores-borboleta'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_adutores_lateral.png' WHERE slug = 'alongamento-de-adutores-lateral'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_cat_cow.png' WHERE slug = 'alongamento-de-gato-camelo-cat-cow'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_cobra.png' WHERE slug = 'alongamento-de-extensao-lombar-cobra'`;
  console.log("Lote 2 atualizado com sucesso no banco!");
}

run().catch(console.error).finally(() => process.exit(0));
