const { Client } = require("pg");
const fs = require("fs");

const client = new Client({
  connectionString:
    "postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

async function getAllExercises() {
  try {
    await client.connect();
    const res = await client.query("SELECT id, name, slug FROM exercises ORDER BY name ASC");
    fs.writeFileSync("all_exercises.json", JSON.stringify(res.rows, null, 2));
    console.log("Salvo 441 exercícios em all_exercises.json");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getAllExercises();
