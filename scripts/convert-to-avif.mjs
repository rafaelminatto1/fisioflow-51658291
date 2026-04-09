import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const INPUT_DIR = 'public/exercises/illustrations';
const OUTPUT_DIR = 'public/exercises/illustrations';

async function convertToAvif() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Input directory ${INPUT_DIR} does not exist.`);
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR);
  const pngFiles = files.filter(file => file.endsWith('.png'));

  console.log(`Found ${pngFiles.length} PNG files to convert.`);

  for (const file of pngFiles) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file.replace('.png', '.avif'));

    try {
      await sharp(inputPath)
        .avif({ quality: 80 })
        .toFile(outputPath);
      
      console.log(`Converted: ${file} -> ${path.basename(outputPath)}`);
    } catch (err) {
      console.error(`Error converting ${file}:`, err);
    }
  }

  console.log('Conversion complete.');
}

convertToAvif();
