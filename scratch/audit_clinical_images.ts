import { builtinClinicalTestsCatalog } from '../src/data/clinicalTestsCatalog';
import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ILLUSTRATIONS_DIR = path.join(PUBLIC_DIR, 'clinical-tests', 'illustrations');

console.log(`Auditing images for ${builtinClinicalTestsCatalog.length} clinical tests...`);
console.log(`Illustrations directory: ${ILLUSTRATIONS_DIR}`);

const missingImageUrl: string[] = [];
const fileNotFound: string[] = [];
const hasImage: string[] = [];

builtinClinicalTestsCatalog.forEach(test => {
  // @ts-ignore - access imageUrl from input if needed, but it's already mapped to image_url in record
  // However, the catalog record has image_url (snake_case)
  const imageUrl = (test as any).image_url;

  if (!imageUrl || imageUrl.startsWith('data:image/svg')) {
    missingImageUrl.push(test.name);
  } else {
    // Check if file exists
    // Path in catalog is usually /clinical-tests/illustrations/filename.avif
    const relativePath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    const absolutePath = path.join(PUBLIC_DIR, relativePath);

    if (fs.existsSync(absolutePath)) {
      hasImage.push(test.name);
    } else {
      fileNotFound.push(`${test.name} (Path: ${imageUrl})`);
    }
  }
});

console.log('\n--- RESULTS ---');
console.log(`Tests with images: ${hasImage.length}`);
console.log(`Tests missing imageUrl (using SVG): ${missingImageUrl.length}`);
console.log(`Tests with imageUrl but FILE NOT FOUND: ${fileNotFound.length}`);

if (missingImageUrl.length > 0) {
  console.log('\n--- MISSING IMAGEURL ---');
  missingImageUrl.forEach(name => console.log(`- ${name}`));
}

if (fileNotFound.length > 0) {
  console.log('\n--- FILE NOT FOUND ---');
  fileNotFound.forEach(info => console.log(`- ${info}`));
}
