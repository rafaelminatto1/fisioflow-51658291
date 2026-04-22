import { builtinClinicalTestsCatalog } from '../src/data/clinicalTestsCatalog';
import fs from 'fs';
import path from 'path';

// Load database results from the file saved in previous step
const dbResultsPath = '/home/rafael/.gemini/antigravity/brain/6e25e95b-d4c2-49d8-8009-6625a0f51269/.system_generated/steps/81/output.txt';
const remoteTests = JSON.parse(fs.readFileSync(dbResultsPath, 'utf8'));

function normalize(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const merged = new Map<string, any>();

// Add builtins
builtinClinicalTestsCatalog.forEach(test => {
  merged.set(normalize(test.name), { ...test, source: 'builtin' });
});

// Add remotes (merge logic)
remoteTests.forEach((remote: any) => {
  const key = normalize(remote.name);
  const builtin = merged.get(key);
  
  // Simulated merge logic from clinicalTestsCatalog.ts
  const finalImage = (builtin?.image_url || builtin?.imageUrl) ?? remote.image_url ?? null;
  
  merged.set(key, {
    name: remote.name,
    image_url: finalImage,
    is_builtin: !!builtin,
    source: builtin ? 'merged' : 'remote_only'
  });
});

const missingImages = Array.from(merged.values()).filter(t => !t.image_url || t.image_url.startsWith('data:image/svg'));

console.log(`Total tests analyzed: ${merged.size}`);
console.log(`Tests missing images: ${missingImages.length}`);

console.log('\n--- TESTS MISSING IMAGES ---');
missingImages.forEach(t => {
  console.log(`- [${t.source}] ${t.name}`);
});
