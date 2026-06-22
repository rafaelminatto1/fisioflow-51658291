import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsvDemographics, buildLegacyPatient, type ScraperPatient } from "./lib/transform";

const here = dirname(fileURLToPath(import.meta.url));
const exportDir = join(here, "data", "zenfisio-export-20260620-v2");
const csvPath = join(here, "..", "..", "Pacientes - Activity Fisioterapia - 6a35aff1a2cd6.csv");
const outPath = join(here, "payload.json");

const demo = parseCsvDemographics(readFileSync(csvPath, "utf-8"));

const files = readdirSync(exportDir).filter((f) => f.startsWith("paciente_") && f.endsWith(".json"));
const patients = [];
let skipped = 0;
let totalEvolutions = 0;
for (const file of files) {
  const raw = JSON.parse(readFileSync(join(exportDir, file), "utf-8")) as ScraperPatient;
  const built = buildLegacyPatient(raw, demo.get(raw.paciente_id));
  if (!built) { skipped++; continue; }
  patients.push(built);
  totalEvolutions += built.evolutions.length;
}

const payload = { replaceExisting: true as const, dryRun: true, patients };
writeFileSync(outPath, JSON.stringify(payload, null, 2));

console.log(`Arquivos lidos: ${files.length}`);
console.log(`Pacientes no payload: ${patients.length} (pulados sem evolução válida: ${skipped})`);
console.log(`Total de evoluções/atendimentos: ${totalEvolutions}`);
console.log(`Payload salvo em: ${outPath}`);
