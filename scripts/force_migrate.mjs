import pkg from "pg";
const { Client } = pkg;
import fs from "fs";

async function run() {
  const env = fs.readFileSync(".env.production", "utf8");
  const urlMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
  if (!urlMatch) throw new Error("No DATABASE_URL found in .env.production");
  const url = urlMatch[1].trim();

  const client = new Client({ connectionString: url });
  await client.connect();
  console.log("Connected to Neon");

  try {
    console.log("Enabling pgvector...");
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");

    console.log("Creating core intelligence tables...");
    // Executa o conteúdo da última migração
    const sql = fs.readFileSync("drizzle/0008_blue_firebrand.sql", "utf8");
    await client.query(sql);

    console.log("Database synchronized successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

run();
