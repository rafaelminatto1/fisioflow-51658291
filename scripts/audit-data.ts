import { builtinClinicalTestsCatalog } from "../src/data/clinicalTestsCatalog";
import { exerciseDictionary } from "../src/data/exerciseDictionary";

async function audit() {
  console.log("--- AUDITORIA DE DADOS FISIOFLOW ---\n");

  // 1. Auditoria de Testes Clínicos
  console.log(">> Testes Clínicos:");
  let clinicalIncomplete = 0;
  builtinClinicalTestsCatalog.forEach((test) => {
    const missingFields = [];
    if (
      !test.evidence_summary ||
      test.evidence_summary.trim() === "" ||
      test.evidence_summary === "Pendente"
    )
      missingFields.push("evidence_summary");
    if (!test.execution || test.execution.trim() === "" || test.execution === "Pendente")
      missingFields.push("execution/instructions");
    if (!test.reference || test.reference.trim() === "" || test.reference === "Pendente")
      missingFields.push("reference");
    if (!test.purpose || test.purpose.trim() === "") missingFields.push("purpose");
    if (!test.positive_sign || test.positive_sign.trim() === "")
      missingFields.push("positive_sign");
    if (!test.image_url || test.image_url.startsWith("data:image/svg+xml"))
      missingFields.push("image_url (fallback SVG)");

    if (missingFields.length > 0) {
      console.log(`[!] Teste: ${test.name} (${test.id}) -> ${missingFields.join(", ")}`);
      clinicalIncomplete++;
    }
  });
  console.log(
    `\nTotal de testes incompletos: ${clinicalIncomplete} / ${builtinClinicalTestsCatalog.length}\n`,
  );

  // 2. Auditoria de Exercícios
  console.log(">> Dicionário de Exercícios:");
  let exercisesIncomplete = 0;

  exerciseDictionary.forEach((ex: any) => {
    const missingFields = [];
    if (!ex.description_pt || ex.description_pt.trim() === "") missingFields.push("description_pt");
    if (!ex.instruction_pt || ex.instruction_pt.trim() === "") missingFields.push("instruction_pt");
    if (!ex.image_url || ex.image_url.trim() === "") missingFields.push("image_url");

    if (missingFields.length > 0) {
      console.log(`[!] Exercício: ${ex.pt} (${ex.id}) -> ${missingFields.join(", ")}`);
      exercisesIncomplete++;
    }
  });
  console.log(
    `\nTotal de exercícios incompletos: ${exercisesIncomplete} / ${exerciseDictionary.length}\n`,
  );
}

audit().catch((err) => {
  console.error("Erro na auditoria:", err);
  process.exit(1);
});
