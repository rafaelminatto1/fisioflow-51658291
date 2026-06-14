import { builtinClinicalTestsCatalog } from "../src/data/clinicalTestsCatalog";

const requiredTestFields = [
  "id",
  "name",
  "category",
  "target_joint",
  "sensitivity_specificity",
  "positive_sign",
  "evidence_label",
  "evidence_summary",
  "source_label",
];

console.log(`Auditing ${builtinClinicalTestsCatalog.length} clinical tests...`);

builtinClinicalTestsCatalog.forEach((test) => {
  const missing = requiredTestFields.filter((field) => !(field in test));
  if (missing.length > 0) {
    console.log(`Test: ${test.name} (${test.id}) is missing: ${missing.join(", ")}`);
  }
});
