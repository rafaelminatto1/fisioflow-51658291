import pg from "pg";
import * as dotenv from "dotenv";
import { readFileSync, existsSync } from "fs";

dotenv.config();
if (!process.env.DATABASE_URL && existsSync(".env.production")) {
  dotenv.config({ path: ".env.production" });
}

async function run() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Conectado ao Neon...");

    const sql = readFileSync("drizzle/0009_brown_wallflower.sql", "utf8");
    const commands = sql.split("--> statement-breakpoint");

    for (let cmd of commands) {
      const trimmed = cmd.trim();
      if (!trimmed) continue;
      console.log("Executando:", trimmed.substring(0, 50) + "...");
      await client.query(trimmed);
    }

    console.log("✅ Migração 0009 aplicada com sucesso!");
  } catch (err) {
    console.error("❌ Erro na migração:", err.message);
  } finally {
    await client.end();
  }
}

run();
