import fs from 'fs';

const dictionaryPath = 'src/data/exerciseDictionary.ts';
const content = fs.readFileSync(dictionaryPath, 'utf8');

// This regex tries to find the exercise definitions
// ex("id", "pt", "en", ..., { ..., image_url: "..." })
const exerciseBlockRegex = /ex\(\s*"(.*?)",\s*"(.*?)",\s*"(.*?)"[\s\S]*?\{([\s\S]*?)\}/g;

console.log('--- EXERCISES MISSING IMAGE_URL ---');
let match;
let missingCount = 0;
while ((match = exerciseBlockRegex.exec(content)) !== null) {
    const id = match[1];
    const pt = match[2];
    const metadata = match[4];
    
    if (!metadata.includes('image_url:')) {
        console.log(`ID: ${id} | Name: ${pt}`);
        missingCount++;
    }
}

console.log(`\nTotal exercises missing image_url: ${missingCount}`);
