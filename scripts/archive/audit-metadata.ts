import { exerciseDictionary } from "../src/data/exerciseDictionary";

const audit = exerciseDictionary
  .map((ex) => {
    const missing = [];
    if (!ex.suggested_sets) missing.push("suggested_sets");
    if (!ex.suggested_reps) missing.push("suggested_reps");
    if (!ex.suggested_rpe) missing.push("suggested_rpe");
    if (!ex.required_equipment) missing.push("required_equipment");
    if (!ex.target_outcome || ex.target_outcome.length === 0) missing.push("target_outcome");

    return {
      id: ex.id,
      name: ex.pt,
      missing,
    };
  })
  .filter((a) => a.missing.length > 0);

console.log(JSON.stringify(audit, null, 2));
console.log(`Total exercises with missing fields: ${audit.length}`);
