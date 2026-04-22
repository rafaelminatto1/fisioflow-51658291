import fs from 'fs';
import path from 'path';

const allExercises = JSON.parse(fs.readFileSync('all_exercises.json', 'utf8'));
const illustrationsDir = 'apps/web/public/exercises/illustrations';
const existingFiles = new Set(fs.readdirSync(illustrationsDir));

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')    // Remove all non-word chars
        .replace(/--+/g, '-');    // Replace multiple - with single -
}

console.log('--- EXERCISES TRULY MISSING IMAGES (No file on disk) ---');
let missingCount = 0;
const trulyMissing = [];

for (const ex of allExercises) {
    if (!ex.image_url && !ex.illustration_url) {
        const slug = slugify(ex.name);
        const avifFile = `${slug}.avif`;
        const pngFile = `${slug}.png`;
        
        if (!existingFiles.has(avifFile) && !existingFiles.has(pngFile)) {
            trulyMissing.push({ name: ex.name, slug });
            missingCount++;
        }
    }
}

// Print first 50
trulyMissing.slice(0, 50).forEach(ex => console.log(`Name: ${ex.name} | Slug: ${ex.slug}`));

console.log(`\nTotal truly missing: ${missingCount}`);
