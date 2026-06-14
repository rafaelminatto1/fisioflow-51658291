import * as fs from "fs";
import * as path from "path";

const enrichedPath = path.join(process.cwd(), "scripts/enriched-data.json");
const enrichedData = JSON.parse(fs.readFileSync(enrichedPath, "utf8"));

const mapIntensityToDifficulty = (intensity: number) => {
  if (intensity <= 2) return "'iniciante'";
  if (intensity <= 4) return "'intermediario'";
  return "'avancado'";
};

let sql =
  "INSERT INTO exercises (slug, name, subcategory, difficulty, equipment, sets_recommended, reps_recommended, image_url, instructions, description, is_active, is_public, updated_at) VALUES\n";

const values = enrichedData
  .map((e) => {
    const slug = e.id.replace("exd-", "");
    const equipment =
      e.required_equipment && e.required_equipment.length > 0
        ? `ARRAY[${e.required_equipment.map((eq) => `'${eq.replace(/'/g, "''")}'`).join(", ")}]::text[]`
        : "ARRAY[]::text[]";
    const instructions = e.instruction_pt ? `'${e.instruction_pt.replace(/'/g, "''")}'` : "NULL";
    const description = e.description_pt ? `'${e.description_pt.replace(/'/g, "''")}'` : "NULL";
    const name = `'${e.pt.replace(/'/g, "''")}'`;
    const subcategory = e.subcategory ? `'${e.subcategory.replace(/'/g, "''")}'` : "NULL";
    const image_url = e.image_url ? `'${e.image_url}'` : "NULL";
    const sets = e.suggested_sets || "NULL";
    const reps = e.suggested_reps || "NULL";
    const difficulty = mapIntensityToDifficulty(e.intensity_level || 1);

    return `('${slug}', ${name}, ${subcategory}, ${difficulty}, ${equipment}, ${sets}, ${reps}, ${image_url}, ${instructions}, ${description}, true, true, NOW())`;
  })
  .join(",\n");

sql += values;
sql += "\nON CONFLICT (slug) DO UPDATE SET\n";
sql += "name = EXCLUDED.name,\n";
sql += "subcategory = EXCLUDED.subcategory,\n";
sql += "difficulty = EXCLUDED.difficulty,\n";
sql += "equipment = EXCLUDED.equipment,\n";
sql += "sets_recommended = EXCLUDED.sets_recommended,\n";
sql += "reps_recommended = EXCLUDED.reps_recommended,\n";
sql += "image_url = EXCLUDED.image_url,\n";
sql += "instructions = EXCLUDED.instructions,\n";
sql += "description = EXCLUDED.description,\n";
sql += "updated_at = NOW();";

fs.writeFileSync(path.join(process.cwd(), "scripts/sync-exercises.sql"), sql);
console.log("Successfully generated scripts/sync-exercises.sql");
