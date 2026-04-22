import fs from 'fs';
import path from 'path';

const dictionaryPath = 'src/data/exerciseDictionary.ts';
const illustrationsDir = 'apps/web/public/exercises/illustrations';

const content = fs.readFileSync(dictionaryPath, 'utf8');
const imageUrlRegex = /image_url:\s*["']\/exercises\/illustrations\/(.*?)["']/g;

const referencedImages = new Set();
let match;
while ((match = imageUrlRegex.exec(content)) !== null) {
    referencedImages.add(match[1]);
}

const existingImages = new Set(fs.readdirSync(illustrationsDir));

console.log('--- MISSING IMAGES (Referenced but not found) ---');
const missing = [];
for (const img of referencedImages) {
    if (!existingImages.has(img)) {
        missing.push(img);
        console.log(img);
    }
}

console.log('\n--- LEGACY EXTENSIONS (Using .png instead of .avif) ---');
for (const img of referencedImages) {
    if (img.endsWith('.png')) {
        console.log(img);
    }
}

console.log('\n--- SUMMARY ---');
console.log(`Total referenced: ${referencedImages.size}`);
console.log(`Total existing: ${existingImages.size}`);
console.log(`Total missing: ${missing.length}`);
