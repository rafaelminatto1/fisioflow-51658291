import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(__dirname, "..", "..", p), "utf8");

/**
 * Regressão do NeonDbError 530 em prod: neon() (driver HTTP) não funciona com a
 * connection string do Hyperdrive (secrets NEON_URL foram deletados na rotação
 * de credenciais). Todo acesso a banco destes módulos deve usar getRawSql/pg.
 */
describe("caminho de banco do scribe/budget", () => {
  it("audioTranscriptionBudget não usa o driver HTTP neon()", () => {
    const src = read("lib/audioTranscriptionBudget.ts");
    expect(src).not.toMatch(/from "@neondatabase\/serverless"/);
  });
  it("VoiceScribeAgent não usa o driver HTTP neon()", () => {
    const src = read("agents/VoiceScribeAgent.ts");
    expect(src).not.toMatch(/@neondatabase\/serverless/);
  });
});
