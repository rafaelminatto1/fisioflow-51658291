const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const updates = {
  'Teste de Jobe': 'https://media.moocafisio.com.br/clinical-tests/illustrations/empty-can-jobe.avif',
  'Adductor Squeeze Test (Doha)': 'https://media.moocafisio.com.br/clinical-tests/illustrations/adductor-squeeze.avif',
  'Y-Balance Test': 'https://media.moocafisio.com.br/clinical-tests/illustrations/y-balance-test.avif',
  'Teste de Trendelenburg': 'https://media.moocafisio.com.br/clinical-tests/illustrations/trendelenburg-sign.avif',
  'Teste de Kibler (Discinesia Escapular)': 'https://media.moocafisio.com.br/clinical-tests/illustrations/kibler-dyskinesis.avif',
  'Teste de Isquiotibiais (BAMIC)': 'https://media.moocafisio.com.br/clinical-tests/illustrations/hamstring-bamic.avif',
  'Gaveta Anterior (Joelho)': 'https://media.moocafisio.com.br/clinical-tests/illustrations/anterior-drawer-knee.avif',
  'Gaveta Anterior (Tornozelo)': 'https://media.moocafisio.com.br/clinical-tests/illustrations/anterior-drawer-ankle.avif',
  'Pivot Shift Test': 'https://media.moocafisio.com.br/clinical-tests/illustrations/pivot-shift-knee.avif',
  'Teste de Patrick (FABER)': 'https://media.moocafisio.com.br/clinical-tests/illustrations/faber-test.avif'
};

async function run() {
  try {
    await client.connect();
    console.log("Connected. Syncing duplicate clinical test images...");
    for (const [name, url] of Object.entries(updates)) {
      const res = await client.query('UPDATE clinical_test_templates SET image_url = $1, updated_at = NOW() WHERE name = $2 RETURNING name', [url, name]);
      if (res.rows.length > 0) {
        console.log(`✅ Updated: "${res.rows[0].name}" -> ${url}`);
      } else {
        console.log(`⚠️ Not found: "${name}"`);
      }
    }
    console.log("Done!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
