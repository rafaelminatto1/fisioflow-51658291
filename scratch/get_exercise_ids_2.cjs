const { Client } = require("pg");

const client = new Client({
  connectionString:
    "postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

async function getExercises() {
  try {
    await client.connect();
    const res = await client.query(
      "SELECT id, name, slug FROM exercises WHERE name ILIKE '%Flexão%' OR name ILIKE '%Push-up%' OR name ILIKE '%Abdução%Deitado%'",
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getExercises();
