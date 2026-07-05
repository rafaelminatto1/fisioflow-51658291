import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const workersTest = [
  "src/agents/__tests__/EvolutionCollaboration.sync.test.ts",
  "src/agents/__tests__/EvolutionCollaboration.auth.test.ts",
];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          globals: true,
          include: ["src/**/*.test.ts"],
          exclude: workersTest,
        },
      },
      {
        plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.test.toml" } })],
        test: {
          name: "workers",
          include: workersTest,
        },
      },
    ],
  },
});
