const { Client } = require("pg");

const client = new Client({
  connectionString:
    "postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

async function getExercises() {
  try {
    await client.connect();
    const targets = [
      "Agachamento Livre",
      "Flexão de Braço",
      "Prancha Abdominal",
      "Afundo",
      "Elevação Pélvica",
      "Panturrilha em Pé",
      "Abdução de Quadril",
    ];

    const query = {
      text: "SELECT id, name, slug FROM exercises WHERE name = ANY($1) OR name ILIKE ANY($2)",
      values: [targets, targets.map((t) => `%${t}%`)],
    };

    const res = await client.query(query);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getExercises();
