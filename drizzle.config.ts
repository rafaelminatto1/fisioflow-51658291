import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import { existsSync } from "fs";

// Tenta carregar .env, se não existir ou não tiver a URL, tenta .env.local
dotenv.config();
if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

export default defineConfig({
  schema: "./packages/db/src/schema/*",
  out: "./packages/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL!.replace("-pooler", ""),
  },
  // Otimizações para Neon/Remote DB
  caching: true,
  verbose: true,
  strict: true,
});
