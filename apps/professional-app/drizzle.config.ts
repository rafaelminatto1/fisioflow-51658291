import type { Config } from "drizzle-orm";

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  driver: "d1",
} satisfies Config;
