import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/data/exerciseDictionary.ts');
let content = fs.readFileSync(filePath, 'utf8');

let total = 0;
let missingIndicated = 0;
let missingContraindicated = 0;
let missingReferences = 0;
let emptyReferences = 0;

let i = 0;
while (i < content.length) {
    let exIndex = content.indexOf('ex(', i);
    if (exIndex === -1) break;

    total++;
    let parens = 1;
    let exContentEnd = exIndex + 3;
    let inString = false;
    let stringChar = '';
    
    while (parens > 0 && exContentEnd < content.length) {
        let c = content[exContentEnd];
        if (!inString) {
            if (c === '"' || c === "'") {
                inString = true;
                stringChar = c;
            } else if (c === '(') {
                parens++;
            } else if (c === ')') {
                parens--;
            }
        } else {
            if (c === stringChar && content[exContentEnd-1] !== '\\') {
                inString = false;
            }
        }
        exContentEnd++;
    }

    let exBody = content.slice(exIndex + 3, exContentEnd - 1);
    
    if (!exBody.includes('indicated_pathologies:')) missingIndicated++;
    if (!exBody.includes('contraindicated_pathologies:')) missingContraindicated++;
    if (!exBody.includes('scientific_references:')) missingReferences++;
    else if (exBody.includes('scientific_references: []')) emptyReferences++;

    i = exContentEnd;
}

console.log(`Total Exercises: ${total}`);
console.log(`Missing Indicated: ${missingIndicated}`);
console.log(`Missing Contraindicated: ${missingContraindicated}`);
console.log(`Missing/Empty References: ${missingReferences + emptyReferences}`);
