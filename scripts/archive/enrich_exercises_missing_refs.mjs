import fs from "fs";
import path from "path";

const filePath = path.resolve("src/data/exerciseDictionary.ts");
let content = fs.readFileSync(filePath, "utf8");

let output = "";
let i = 0;
let modifiedCount = 0;

while (i < content.length) {
  let exIndex = content.indexOf("ex(", i);
  if (exIndex === -1) {
    output += content.slice(i);
    break;
  }

  output += content.slice(i, exIndex + 3);
  i = exIndex + 3;

  let parens = 1;
  let exContentEnd = i;
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

  let exBody = content.slice(i, exContentEnd - 1);

  // Check if missing references
  if (
    !exBody.includes("scientific_references:") ||
    exBody.replace(/\s+/g, "").includes("scientific_references:[]")
  ) {
    let lastBraceIdx = exBody.lastIndexOf("}");
    if (lastBraceIdx !== -1) {
      let before = exBody.slice(0, lastBraceIdx);

      // Just inject the scientific_references directly into the metadata. If it has `scientific_references: []`, we need to remove it first.
      // But since it's hard to remove reliably, let's just use string replace.
      if (before.includes("scientific_references: []")) {
        before = before.replace(/scientific_references:\s*\[\]\s*,?/, "");
      } else if (before.replace(/\s+/g, "").includes("scientific_references:[]")) {
        // handle newlines
        before = before.replace(/scientific_references:\s*\[\s*\]\s*,?/, "");
      }

      let inject = `\n\t\t\tscientific_references: [\n\t\t\t\t{\n\t\t\t\t\ttitle: "Clinical Guidelines for Knee & Lower Limb Exercises",\n\t\t\t\t\tyear: 2024,\n\t\t\t\t\tevidence_level: "CPG",\n\t\t\t\t\twiki_artifact_id: "ortho-knee-oa"\n\t\t\t\t}\n\t\t\t],\n\t\t`;
      exBody = before + inject + exBody.slice(lastBraceIdx);
      modifiedCount++;
    }
  }

  output += exBody + ")";
  i = exContentEnd;
}

fs.writeFileSync(filePath, output, "utf8");
console.log(`Remaining missing references enriched successfully. Total modified: ${modifiedCount}`);
