import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function run() {
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_antebraco_flexores.png' WHERE slug = 'alongamento-de-antebraco-flexores'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_antebraco_extensores.png' WHERE slug = 'alongamento-de-antebraco-extensores'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_pescoco_trapezio.png' WHERE slug = 'alongamento-de-pescoco-trapezio-superior'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_levantador_escapula.png' WHERE slug = 'alongamento-de-levantador-da-escapula'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_romboides_abraco.png' WHERE slug = 'alongamento-de-romboides-abraco-a-si-mesmo'`;
  console.log("Lote 4 atualizado com sucesso no banco!");
}

run().catch(console.error).finally(() => process.exit(0));
