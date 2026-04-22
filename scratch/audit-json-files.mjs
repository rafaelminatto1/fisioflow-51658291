import fs from 'fs';
import path from 'path';

const exercisesDataPath = 'scripts/data/exercises.json';
const illustrationsDir = 'apps/web/public/exercises/illustrations';

const data = JSON.parse(fs.readFileSync(exercisesDataPath, 'utf8'));
const existingImages = new Set(fs.readdirSync(illustrationsDir));

console.log('--- EXERCISES IN JSON MISSING IMAGE DATA & FILE ---');
let missingCount = 0;
for (const ex of data.exercises) {
    if (!ex.image_url && !ex.illustration_url) {
        // Check if a file with the slug exists
        const possibleFileName = `${ex.slug}.avif`;
        if (!existingImages.has(possibleFileName)) {
            console.log(`Name: ${ex.name} | Slug: ${ex.slug} | Expected File: ${possibleFileName}`);
            missingCount++;
        }
    }
}

console.log(`\nTotal: ${missingCount}`);
