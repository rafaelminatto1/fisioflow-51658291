const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const fixes = [
  { slug: "ponte-de-gluteo-bilateral", path: "/exercises/illustrations/ponte-gluteo.avif" },
  { slug: "ponte-de-gluteo", path: "/exercises/illustrations/ponte-gluteo-v2.avif" },
  {
    slug: "fortalecimento-de-gluteo",
    path: "/exercises/illustrations/fortalecimento-gluteo-lateral.avif",
  },
  { slug: "circulos-de-quadril", path: "/exercises/illustrations/circulos-quadril.avif" },
  { slug: "agachamento-com-suporte", path: "/exercises/illustrations/agachamento-suporte.avif" },
  { slug: "flexao-de-braco-na-parede", path: "/exercises/illustrations/flexao-braco.avif" },
  { slug: "tuck-jump-salto-grupard", path: "/exercises/illustrations/tuck-jump.avif" },
  {
    slug: "alongamento-de-quadriceps-em-pe",
    path: "/exercises/illustrations/alongamento-quadriceps.avif",
  },
  { slug: "ponte-de-gluteo-unilateral", path: "/exercises/illustrations/ponte-gluteo.avif" },
  {
    slug: "deslizamento-de-calcanhar",
    path: "/exercises/illustrations/deslizamento-calcanhar.avif",
  },
  {
    slug: "rotacao-externa-de-ombro",
    path: "/exercises/illustrations/rotacao-externa-ombro-elastico.avif",
  },
  {
    slug: "deslizamento-de-nervo-mediano",
    path: "/exercises/illustrations/deslizamento-nervo-mediano.avif",
  },
  { slug: "star-excursion-balance-test-sebt", path: "/exercises/illustrations/sebt.avif" },
  {
    slug: "rotacao-externa-de-ombro-com-faixa",
    path: "/exercises/illustrations/rotacao-externa-ombro.avif",
  },
  { slug: "mobilidade-de-ombro", path: "/exercises/illustrations/mobilidade-ombro.avif" },
  {
    slug: "rotacao-interna-de-ombro-com-faixa",
    path: "/exercises/illustrations/rotacao-interna-ombro.avif",
  },
  { slug: "perdigueiro-bird-dog", path: "/exercises/illustrations/bird-dog.avif" },
  { slug: "prancha-abdominal-plank", path: "/exercises/illustrations/prancha-abdominal.avif" },
  { slug: "side-plank-prancha-lateral", path: "/exercises/illustrations/prancha-lateral.avif" },
  {
    slug: "mobilizacao-de-quadril-capsular",
    path: "/exercises/illustrations/mobilizacao-quadril-capsular.avif",
  },
  {
    slug: "mobilizacao-de-ombro-com-bastao",
    path: "/exercises/illustrations/mobilizacao-ombro-bastao.avif",
  },
  {
    slug: "deslizamento-do-nervo-mediano",
    path: "/exercises/illustrations/deslizamento-nervo-mediano.avif",
  },
  {
    slug: "fortalecimento-de-preensao-bolinha",
    path: "/exercises/illustrations/fortalecimento-preensao-bolinha.avif",
  },
];

async function run() {
  try {
    await client.connect();
    console.log(`🛠️ Applying ${fixes.length} deep audit fixes...`);

    let count = 0;
    for (const fix of fixes) {
      const res = await client.query(
        "UPDATE exercises SET image_url = $1, thumbnail_url = $1, updated_at = NOW() WHERE slug = $2",
        [fix.path, fix.slug],
      );
      if (res.rowCount > 0) {
        console.log(`✅ Applied: ${fix.slug} -> ${fix.path}`);
        count++;
      }
    }

    console.log(`✨ Finished: ${count} exercises corrected.`);
  } catch (err) {
    console.error("❌ Error applying fixes:", err);
  } finally {
    await client.end();
  }
}

run();
