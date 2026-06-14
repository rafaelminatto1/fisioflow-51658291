import fs from "fs";
import path from "path";

const filePath = path.resolve("src/data/exerciseDictionary.ts");
let content = fs.readFileSync(filePath, "utf8");

let total = 0;
let missingSets = 0;
let missingRepsOrDuration = 0;
let missingBoth = 0;

let i = 0;
while (i < content.length) {
  let exIndex = content.indexOf("ex(", i);
  if (exIndex === -1) break;

  total++;
  let parens = 1;
  let exContentEnd = exIndex + 3;
  let inString = false;
  let stringChar = "";

  while (parens > 0 && exContentEnd < content.length) {
    let c = content[exContentEnd];
    if (!inString) {
      if (c === '"' || c === "'") {
        inString = true;
        stringChar = c;
      } else if (c === "(") {
        parens++;
      } else if (c === ")") {
        parens--;
      }
    } else {
      if (c === stringChar && content[exContentEnd - 1] !== "\\") {
        inString = false;
      }
    }
    exContentEnd++;
  }

  let exBody = content.slice(exIndex + 3, exContentEnd - 1);

  let hasSets = exBody.includes("suggested_sets:");
  let hasReps = exBody.includes("suggested_reps:");
  let hasDuration = exBody.includes("suggested_duration_seconds:");

  if (!hasSets) missingSets++;
  if (!hasReps && !hasDuration) missingRepsOrDuration++;
  if (!hasSets && !hasReps && !hasDuration) missingBoth++;

  i = exContentEnd;
}

console.log(`Total Exercises: ${total}`);
console.log(`Missing suggested_sets: ${missingSets}`);
console.log(`Missing both reps and duration: ${missingRepsOrDuration}`);
console.log(`Missing ALL (sets, reps, and duration): ${missingBoth}`);
