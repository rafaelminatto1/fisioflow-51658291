#!/usr/bin/env node
/**
 * Catraca de erros de tipo da web.
 *
 * A web tem ~3.5 mil erros de tipo pré-existentes. Corrigir todos é trabalho de
 * semanas, e enquanto isso o `tsc` não serve de rede de proteção: ninguém
 * consegue distinguir um erro novo no meio de milhares antigos.
 *
 * Esta catraca resolve o problema intermediário. Ela não exige zero erros —
 * exige que o número NÃO CRESÇA. Assim a dívida fica congelada, código novo
 * nasce limpo, e cada correção baixa o teto permanentemente.
 *
 * Se você baixou o número: rode com --update e commite o baseline novo.
 * Se você subiu: o build falha e mostra em quais arquivos, para você corrigir
 * antes de mesclar.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(raiz, "typecheck-baseline.json");
const atualizar = process.argv.includes("--update");

function coletarErros() {
  try {
    execSync("npx tsc --noEmit -p tsconfig.app.json", {
      cwd: raiz,
      stdio: "pipe",
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192" },
    });
    return [];
  } catch (e) {
    const saida = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    return saida
      .split("\n")
      .filter((l) => / error TS\d+: /.test(l))
      .map((l) => l.split("(")[0].trim())
      .filter(Boolean);
  }
}

const erros = coletarErros();
const total = erros.length;

// Contagem por diretório de primeiro nível: um arquivo renomeado não deve
// disparar alarme falso, mas uma área piorando deve aparecer.
const porArea = {};
for (const arquivo of erros) {
  const area = arquivo.split("/").slice(0, 2).join("/");
  porArea[area] = (porArea[area] ?? 0) + 1;
}

if (atualizar || !existsSync(BASELINE)) {
  writeFileSync(
    BASELINE,
    `${JSON.stringify({ total, porArea, atualizadoEm: new Date().toISOString().slice(0, 10) }, null, 2)}\n`,
  );
  console.log(`Baseline gravado: ${total} erros.`);
  process.exit(0);
}

const base = JSON.parse(readFileSync(BASELINE, "utf8"));

if (total > base.total) {
  console.error(`\n✘ Erros de tipo AUMENTARAM: ${base.total} → ${total} (+${total - base.total})\n`);
  const piores = Object.entries(porArea)
    .map(([area, n]) => [area, n - (base.porArea[area] ?? 0)])
    .filter(([, d]) => d > 0)
    .sort((a, b) => b[1] - a[1]);
  if (piores.length) {
    console.error("Áreas que pioraram:");
    for (const [area, d] of piores.slice(0, 10)) console.error(`  +${d}  ${area}`);
  }
  console.error("\nCorrija antes de mesclar. A dívida existente está congelada;");
  console.error("o que não pode é crescer.\n");
  process.exit(1);
}

if (total < base.total) {
  console.log(`✔ Erros de tipo DIMINUÍRAM: ${base.total} → ${total} (−${base.total - total}).`);
  console.log("Rode `node scripts/typecheck-ratchet.mjs --update` e commite o baseline novo,");
  console.log("para o ganho ficar travado.");
  process.exit(0);
}

console.log(`✔ Erros de tipo estáveis em ${total}.`);
