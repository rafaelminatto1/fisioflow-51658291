import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guarda de regressão.
 *
 * `deterministicBiomechanicsMetrics()` devolvia números fixos por tipo de
 * avaliação — cadência 168, tempo de contato 248, valgo 12, simetria 86 — sem
 * olhar o vídeo, e esses números chegavam a um laudo assinado com CREFITO.
 *
 * A função foi apagada. Este teste existe para que ela não volte: não se pode
 * publicar dado falso que não se consegue gerar. Se você chegou aqui porque o
 * teste quebrou, a pergunta certa não é como silenciá-lo — é de onde o número
 * que você está prestes a gravar vem.
 */

const SRC = join(__dirname, "..");

const IDENTIFICADORES_PROIBIDOS = [
  "deterministicBiomechanicsMetrics",
  "DEMO_METRICS",
  "MOCK_TRAJECTORY",
];

function arquivosTs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) arquivosTs(full, acc);
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) acc.push(full);
  }
  return acc;
}

describe("nenhuma métrica biomecânica sintética no código do Worker", () => {
  const arquivos = arquivosTs(SRC);

  it("varre uma quantidade plausível de arquivos (o próprio teste não pode virar no-op)", () => {
    expect(arquivos.length).toBeGreaterThan(100);
  });

  for (const identificador of IDENTIFICADORES_PROIBIDOS) {
    it(`não reintroduz \`${identificador}\``, () => {
      const culpados = arquivos.filter((file) => {
        const conteudo = readFileSync(file, "utf8");
        // Menção em comentário explicando por que foi removido é permitida.
        return conteudo
          .split("\n")
          .some(
            (linha) =>
              linha.includes(identificador) &&
              !linha.trimStart().startsWith("*") &&
              !linha.trimStart().startsWith("//"),
          );
      });

      expect(culpados.map((f) => f.replace(SRC, "src"))).toEqual([]);
    });
  }

  it("o consumidor da fila não grava métrica sem procedência declarada", () => {
    const queue = readFileSync(join(SRC, "queue.ts"), "utf8");
    const insercoes = queue.match(/INSERT INTO biomechanics_metrics[\s\S]*?\)/g) ?? [];

    expect(insercoes.length).toBeGreaterThan(0);
    for (const insercao of insercoes) {
      expect(insercao).toContain("provenance");
    }
  });

  it("o consumidor não inventa symmetry_score quando a simetria não é mensurável", () => {
    const queue = readFileSync(join(SRC, "queue.ts"), "utf8");
    // O código antigo tinha `?? 84`. Qualquer default numérico aqui é suspeito.
    expect(queue).not.toMatch(/symmetry\s*=\s*[^;]*\?\?\s*\d+/);
  });
});
