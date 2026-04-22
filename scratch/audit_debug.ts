import { builtinClinicalTestsCatalog } from '../src/data/clinicalTestsCatalog';
import fs from 'fs';

const dbResultsPath = '/home/rafael/.gemini/antigravity/brain/6e25e95b-d4c2-49d8-8009-6625a0f51269/.system_generated/steps/81/output.txt';
const remoteTests = JSON.parse(fs.readFileSync(dbResultsPath, 'utf8'));

function normalize(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const merged = new Map<string, any>();

// Simulate exactly how the code indexes now
for (const builtin of builtinClinicalTestsCatalog) {
  const namesToIndex = [
    builtin.name,
    ...(builtin.aliases_pt ?? []),
    ...(builtin.aliases_en ?? []),
  ];
  for (const name of namesToIndex) {
    if (name) {
      const key = normalize(name);
      merged.set(key, builtin);
    }
  }
}

console.log(`Indexed ${merged.size} names/aliases for builtins.`);

// Check for "Teste de Jobe" specifically
const jobeKey = normalize("Teste de Jobe");
console.log(`Jobe key: "${jobeKey}"`);
console.log(`Has Jobe key? ${merged.has(jobeKey)}`);
if (merged.has(jobeKey)) {
  console.log(`Matched builtin for Jobe: ${merged.get(jobeKey).id}`);
}

const finalResults = new Map<string, any>();

remoteTests.forEach((remote: any) => {
  const key = normalize(remote.name);
  const builtin = merged.get(key);
  
  const finalImage = (builtin?.image_url || builtin?.imageUrl) ?? remote.image_url ?? null;
  
  finalResults.set(key, {
    name: remote.name,
    image_url: finalImage,
    is_builtin: !!builtin,
    source: builtin ? 'merged' : 'remote_only'
  });
});

const missingImages = Array.from(finalResults.values()).filter(t => !t.image_url || t.image_url.startsWith('data:image/svg'));

console.log(`\nTests missing images: ${missingImages.length}`);
missingImages.forEach(t => {
  console.log(`- [${t.source}] ${t.name}`);
});
