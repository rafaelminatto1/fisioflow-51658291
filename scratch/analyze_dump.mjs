import fs from 'fs';

const dumpFile = 'scratch/exercises_dump.jsonl';
const exercises = fs.readFileSync(dumpFile, 'utf8').split('\n').filter(Boolean).map(JSON.parse);

console.log(`Total exercises: ${exercises.length}`);

const missingDosage = exercises.filter(e => !e.sets_recommended || !e.reps_recommended);
const missingPathologies = exercises.filter(e => !e.pathologies_indicated || e.pathologies_indicated.length === 0);
const missingReferences = exercises.filter(e => !e.references);

console.log(`Missing dosage: ${missingDosage.length}`);
console.log(`Missing pathologies: ${missingPathologies.length}`);
console.log(`Missing references: ${missingReferences.length}`);

// Example of exercises missing dosage
console.log('\nExamples missing dosage:');
missingDosage.slice(0, 5).forEach(e => console.log(`- ${e.name} (${e.slug})`));

// Create a report
const report = {
    total: exercises.length,
    missingDosage: missingDosage.map(e => ({ id: e.id, name: e.name, slug: e.slug })),
    missingPathologies: missingPathologies.map(e => ({ id: e.id, name: e.name, slug: e.slug })),
    missingReferences: missingReferences.map(e => ({ id: e.id, name: e.name, slug: e.slug }))
};

fs.writeFileSync('scratch/missing_report.json', JSON.stringify(report, null, 2));
