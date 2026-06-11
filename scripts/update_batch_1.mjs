import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function run() {
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_isquio_sentado.png' WHERE slug = 'alongamento-de-isquiotibiais-sentado'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_quad_pe.png' WHERE slug = 'alongamento-de-quadriceps-em-pe'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_panturrilha.png' WHERE slug = 'alongamento-de-panturrilha-na-parede'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_gluteo_deitado.png' WHERE slug = 'alongamento-de-gluteo-figura-4-deitado'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_gluteo_sentado.png' WHERE slug = 'alongamento-de-gluteo-figura-4-sentado'`;
  console.log("Lote 1 atualizado com sucesso no banco!");
}

run().catch(console.error).finally(() => process.exit(0));
