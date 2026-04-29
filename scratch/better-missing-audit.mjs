import fs from "fs";
import path from "path";

const allExercises = JSON.parse(fs.readFileSync("all_exercises.json", "utf8"));
const illustrationsDir = "apps/web/public/exercises/illustrations";
const existingFiles = new Set(fs.readdirSync(illustrationsDir));

function normalizeSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

console.log("--- RE-AUDITING MISSING IMAGES ---");
let missingCount = 0;
const trulyMissing = [];

for (const ex of allExercises) {
  if (!ex.image_url && !ex.illustration_url) {
    const slug = normalizeSlug(ex.name);
    const avifFile = `${slug}.avif`;

    // Try some variations
    const variations = [avifFile, `${slug}.png`, `${slug}.webp`];

    let found = false;
    for (const v of variations) {
      if (existingFiles.has(v)) {
        found = true;
        break;
      }
    }

    if (!found) {
      trulyMissing.push({ name: ex.name, slug });
      missingCount++;
    }
  }
}

console.log(`\nTotal truly missing after normalization: ${missingCount}`);
console.log("\n--- TOP 20 TRULY MISSING ---");
trulyMissing.slice(0, 20).forEach((ex) => console.log(`- ${ex.name} (${ex.slug})`));
