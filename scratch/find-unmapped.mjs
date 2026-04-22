import fs from 'fs';

const allExercises = JSON.parse(fs.readFileSync('all_exercises.json', 'utf8'));
const dictionaryContent = fs.readFileSync('src/data/exerciseDictionary.ts', 'utf8');
const illustrationsDir = 'apps/web/public/exercises/illustrations';
const existingFiles = fs.readdirSync(illustrationsDir);

function normalizeSlug(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

const unmappedWithImages = [];

for (const ex of allExercises) {
    const slug = normalizeSlug(ex.name);
    const avifFile = `${slug}.avif`;
    
    if (existingFiles.includes(avifFile)) {
        // Check if it's in dictionary
        if (!dictionaryContent.includes(slug)) {
            unmappedWithImages.push({ name: ex.name, slug, file: avifFile });
        }
    }
}

console.log('--- UNMAPPED EXERCISES WITH IMAGES ON DISK ---');
unmappedWithImages.forEach(ex => console.log(`${ex.name} | ${ex.slug}`));
console.log(`Total: ${unmappedWithImages.length}`);
