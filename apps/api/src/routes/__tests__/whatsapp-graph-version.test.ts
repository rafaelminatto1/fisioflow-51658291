import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Guarda contra versões deprecadas da Graph API da Meta (v18 já passou do sunset
 * → chamadas a subscriptions/messages podem retornar 400). O resto do código usa
 * v25.0; whatsapp.ts não pode regredir para versões antigas.
 */
describe("whatsapp.ts — Graph API version", () => {
  it("não referencia versões deprecadas da Graph API (< v20)", () => {
    const src = readFileSync(join(here, "..", "whatsapp.ts"), "utf8");
    const matches = src.match(/graph\.facebook\.com\/v(\d+)\.0/g) ?? [];
    const deprecated = matches.filter((m) => {
      const v = Number(m.match(/v(\d+)\.0/)?.[1] ?? "0");
      return v < 20;
    });
    expect(deprecated).toEqual([]);
  });
});
