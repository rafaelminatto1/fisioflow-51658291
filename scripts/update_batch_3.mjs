import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function run() {
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_crianca.png' WHERE slug = 'alongamento-de-flexao-lombar-posicao-da-crianca'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_crianca_rotacao.png' WHERE slug = 'alongamento-toracico-child-pose-com-rotacao'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_peitoral_porta.png' WHERE slug = 'alongamento-de-peitoral-na-porta'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_peitoral_canto.png' WHERE slug = 'alongamento-de-peitoral-no-canto-da-parede'`;
  await sql`UPDATE exercises SET image_url = '/images/exercises/along_triceps_overhead.png' WHERE slug = 'alongamento-de-triceps-overhead'`;
  console.log("Lote 3 atualizado com sucesso no banco!");
}

run().catch(console.error).finally(() => process.exit(0));
