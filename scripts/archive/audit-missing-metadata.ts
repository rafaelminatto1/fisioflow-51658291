import { exerciseDictionary } from "../src/data/exerciseDictionary";

console.log(`Auditing ${exerciseDictionary.length} exercises for missing metadata...\n`);

const missing: string[] = [];

exerciseDictionary.forEach((ex) => {
  const fields = [];
  if (!ex.progression_suggestion) fields.push("progression_suggestion");
  if (!ex.suggested_sets) fields.push("suggested_sets");
  if (!ex.suggested_reps) fields.push("suggested_reps");
  if (!ex.suggested_rpe) fields.push("suggested_rpe");
  if (!ex.intensity_level) fields.push("intensity_level");

  if (fields.length > 0) {
    missing.push(`[${ex.id}] ${ex.pt}: Missing ${fields.join(", ")}`);
  }
});

if (missing.length === 0) {
  console.log("✅ All exercises have full metadata!");
} else {
  console.log(`❌ Found ${missing.length} exercises with missing fields:\n`);
  missing.forEach((m) => console.log(m));
}
