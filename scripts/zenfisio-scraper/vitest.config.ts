import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/zenfisio-scraper/lib/**/*.test.ts"],
  },
});
