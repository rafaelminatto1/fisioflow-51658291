import fs from 'fs';

const data = JSON.parse(fs.readFileSync('all_exercises.json', 'utf8'));

console.log('--- EXERCISES IN ALL_EXERCISES.JSON MISSING IMAGE ---');
let missingCount = 0;
for (const ex of data) {
    if (!ex.image_url && !ex.illustration_url) {
        console.log(`Name: ${ex.name} | ID: ${ex.id}`);
        missingCount++;
    }
}

console.log(`\nTotal: ${missingCount}`);
