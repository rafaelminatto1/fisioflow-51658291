import fs from "fs";

const exercisesDataPath = "scripts/data/exercises.json";
const data = JSON.parse(fs.readFileSync(exercisesDataPath, "utf8"));

console.log("--- EXERCISES IN JSON MISSING IMAGE DATA ---");
let missingCount = 0;
for (const ex of data.exercises) {
  if (!ex.image_url && !ex.illustration_url) {
    console.log(`Name: ${ex.name} | Slug: ${ex.slug}`);
    missingCount++;
  }
}

console.log(`\nTotal exercises in JSON missing image: ${missingCount}`);
