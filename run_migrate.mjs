import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const client = new Client({
  connectionString: process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL.replace("-pooler", "")
});

async function main() {
  await client.connect();
  const db = drizzle(client);
  console.log("Starting migration...");
  await migrate(db, { migrationsFolder: "./packages/db/migrations" });
  console.log("Migration successful!");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
