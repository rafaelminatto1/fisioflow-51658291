import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import { existsSync } from "fs";

// Tenta carregar .env, se não existir ou não tiver a URL, tenta .env.production
dotenv.config();
if (!process.env.DATABASE_URL && existsSync(".env.production")) {
  dotenv.config({ path: ".env.production" });
}

export default defineConfig({
  schema: "./packages/db/src/schema/*",
  out: "./packages/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Otimizações para Neon/Remote DB
  caching: true,
  verbose: true,
  strict: true,
});
