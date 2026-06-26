import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEPRECATED_MODELS_2026_05_30, WORKERS_AI_MODELS } from "../lib/workersAi";

function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("Workers AI model deprecation 2026-05-30", () => {
  it("nenhum modelo deprecado deve ser referenciado em apps/api/src/ (exceto workersAi.ts)", () => {
    // Lista todos os arquivos .ts e procura cada modelo deprecado seguido de
    // boundary não-`-` ou `-` que NÃO inicia `-fast`/`-lora`/`-awq`-only-on-allowed.
    const cwd = process.cwd().endsWith("/apps/api") ? "../.." : ".";
    const files = listTsFiles(join(cwd, "apps/api/src")).map((file) => file.replace(`${cwd}/`, ""));
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith("lib/workersAi.ts")) continue;
      if (file.endsWith("__tests__/ai-models.test.ts")) continue;
      const content = readFileSync(join(cwd, file), "utf8");
      const lines = content.split("\n");
      for (const dep of DEPRECATED_MODELS_2026_05_30) {
        // regex: modelo seguido de aspas/whitespace/fim — não pode ser `-fast`/`-lora`
        const escaped = dep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(
          `${escaped}(?!-fast|-lora|-instruct-fast|-instruct-lora)["'\\s,;)\\]}]`,
        );
        lines.forEach((line, idx) => {
          if (rx.test(line)) offenders.push(`${file}:${idx + 1}: ${line.trim()}`);
        });
      }
    }
    expect(offenders, `Modelos deprecados:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("WORKERS_AI_MODELS.llama_3_1_8b deve usar a variante -fast", () => {
    expect(WORKERS_AI_MODELS.llama_3_1_8b).toBe("@cf/meta/llama-3.1-8b-instruct-fast");
  });

  it("DEPRECATED_MODELS_2026_05_30 inclui llama-3.1-8b base (sem -fast)", () => {
    expect(DEPRECATED_MODELS_2026_05_30).toContain("@cf/meta/llama-3.1-8b-instruct");
  });
});
