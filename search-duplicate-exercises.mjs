import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const brokenNames = [
    "Ankle Pumps (Bombinha)",
    "Salto Lateral (Lateral Bound)",
    "Quadríceps Arco Curto",
    "Elevação de Perna Retificada (SLR)",
    "Salto Unipodal com Aterrissagem",
    "Isometria de Quadríceps (Quad Sets)"
  ];

  try {
    for (const name of brokenNames) {
      console.log(`\n🔍 Searching for similar to: "${name}"`);
      // Search by partial name
      const query = `%${name.split(' (')[0]}%`;
      const res = await sql`
        SELECT id, name, image_url, thumbnail_url 
        FROM exercises 
        WHERE name ILIKE ${query}
      `;
      console.table(res);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}
run();
