import fs from "fs";

const dictionaryContent = fs.readFileSync("src/data/exerciseDictionary.ts", "utf8");
const jsonContent = JSON.parse(fs.readFileSync("scripts/data/exercises.json", "utf8"));

const dictionaryNames = new Set();
const dictionaryIds = new Set();

// Extract from dictionary
const exerciseRegex = /ex\(\s*"(.*?)",\s*"(.*?)",\s*"(.*?)"/g;
let match;
while ((match = exerciseRegex.exec(dictionaryContent)) !== null) {
  dictionaryIds.add(match[1]);
  dictionaryNames.add(match[2].toLowerCase());
}

console.log("--- EXERCISES IN JSON BUT NOT IN DICTIONARY ---");
let missingCount = 0;
for (const ex of jsonContent.exercises) {
  const nameLower = ex.name.toLowerCase();
  if (!dictionaryNames.has(nameLower)) {
    console.log(`Name: ${ex.name} | Slug: ${ex.slug}`);
    missingCount++;
  }
}

console.log(`\nTotal: ${missingCount}`);
