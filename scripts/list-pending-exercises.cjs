const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();

    // Buscamos exercícios que ainda usam imagens compartilhadas ou padrão
    // No FisioFlow, exercícios "pendentes" são aqueles onde o image_url não contém o slug do exercício
    // ou que o usuário marcou para substituição.

    const res = await client.query(`
            SELECT id, slug, name, image_url
            FROM exercises
            WHERE is_active = true
            ORDER BY name ASC
        `);

    const exercises = res.rows;
    const pending = [];

    for (const ex of exercises) {
      // Se o image_url não contiver a slug (ou parte significativa dela), consideramos pendente de ilustração exclusiva
      const slugBase = ex.slug.split("-")[0]; // Simplificação para checagem rápida
      if (!ex.image_url || !ex.image_url.includes(ex.slug)) {
        pending.push(ex);
      }
    }

    console.log(`📋 Total exercises: ${exercises.length}`);
    console.log(`⚠️ Pending unique illustration: ${pending.length}`);
    console.log("\n--- LIST OF PENDING EXERCISES ---");
    pending.forEach((ex, i) => {
      console.log(`${i + 1}. [${ex.name}] (slug: ${ex.slug}) counts as: ${ex.image_url}`);
    });
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.end();
  }
}

run();
