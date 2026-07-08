import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const workersTest = [
  "src/agents/__tests__/EvolutionCollaboration.sync.test.ts",
  "src/agents/__tests__/EvolutionCollaboration.auth.test.ts",
  "src/agents/__tests__/EvolutionCollaboration.persist.test.ts",
];

// 15s em vez dos 5s default: sob a suíte completa o primeiro teste de cada
// arquivo paga o custo de transform/import em paralelo e estoura 5s de forma
// intermitente (passa isolado, falha no gate). 15s absorve o pico de
// contenção sem mascarar um hang real.
const CONTENTION_TIMEOUT_MS = 15_000;

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
          testTimeout: CONTENTION_TIMEOUT_MS,
          hookTimeout: CONTENTION_TIMEOUT_MS,
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
