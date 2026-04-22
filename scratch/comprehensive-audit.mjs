import fs from 'fs';

const content = fs.readFileSync('src/data/exerciseDictionary.ts', 'utf8');

// Regex to find exercise blocks: ex("id", "pt", "en", ..., { image_url: "..." })
const exerciseRegex = /ex\(\s*"(.*?)",\s*"(.*?)",\s*"(.*?)"[\s\S]*?\{([\s\S]*?)\}/g;

const exercises = [];
let match;
while ((match = exerciseRegex.exec(content)) !== null) {
    const id = match[1];
    const pt = match[2];
    const en = match[3];
    const metadata = match[4];
    
    const imageUrlMatch = metadata.match(/image_url:\s*["'](.*?)["']/);
    const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
    
    exercises.push({ id, pt, en, imageUrl });
}

console.log(`Total exercises found in dictionary: ${exercises.length}`);

const missing = exercises.filter(ex => !ex.imageUrl || ex.imageUrl === "" || ex.imageUrl.includes('placeholder'));
console.log(`\n--- EXERCISES MISSING IMAGE_URL ---`);
missing.forEach(ex => console.log(`ID: ${ex.id} | Name: ${ex.pt}`));

const withPng = exercises.filter(ex => ex.imageUrl && ex.imageUrl.endsWith('.png'));
console.log(`\n--- EXERCISES WITH .PNG (Needs conversion) ---`);
withPng.forEach(ex => console.log(`ID: ${ex.id} | Name: ${ex.pt} | Image: ${ex.imageUrl}`));
