import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function run() {
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_isquio_sentado.png' WHERE slug = 'alongamento-de-isquiotibiais-sentado'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_quad_pe.png' WHERE slug = 'alongamento-de-quadriceps-em-pe'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_panturrilha.png' WHERE slug = 'alongamento-de-panturrilha-na-parede'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_gluteo_deitado.png' WHERE slug = 'alongamento-de-gluteo-figura-4-deitado'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_gluteo_sentado.png' WHERE slug = 'alongamento-de-gluteo-figura-4-sentado'`;
  console.log("Lote 1 atualizado com sucesso no banco!");
}

run()
  .catch(console.error)
  .finally(() => process.exit(0));
