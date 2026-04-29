import { builtinClinicalTestsCatalog } from "./src/data/clinicalTestsCatalog.ts";

const audit = builtinClinicalTestsCatalog.map((test) => {
  return {
    name: test.name,
    hasImage: !!test.image_url && !test.image_url.startsWith("data:image/svg+xml"),
    hasInitialPos: !!test.initial_position_image_url,
    hasFinalPos: !!test.final_position_image_url,
    hasReference: !!test.reference,
    hasSummary:
      !!test.evidence_summary && test.evidence_summary !== "Teste criado ou adaptado pela equipe.",
    hasSensSpec: !!test.sensitivity_specificity,
  };
});

console.log(JSON.stringify(audit, null, 2));
