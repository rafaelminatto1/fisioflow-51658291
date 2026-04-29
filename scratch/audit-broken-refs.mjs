import fs from "fs";

const content = fs.readFileSync("src/data/exerciseDictionary.ts", "utf8");
const illustrationsDir = "apps/web/public/exercises/illustrations";
const existingFiles = new Set(fs.readdirSync(illustrationsDir));

const imageUrlRegex = /image_url:\s*["']\/exercises\/illustrations\/(.*?)["']/g;

console.log("--- BROKEN IMAGE REFERENCES IN DICTIONARY ---");
let match;
while ((match = imageUrlRegex.exec(content)) !== null) {
  const file = match[1];
  if (!existingFiles.has(file)) {
    console.log(`Missing: ${file}`);
  }
}
