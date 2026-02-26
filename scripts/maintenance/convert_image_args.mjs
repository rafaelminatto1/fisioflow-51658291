
import sharp from 'sharp';
import fs from 'fs';

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.error('Usage: node convert_image.mjs <input> <output>');
  process.exit(1);
}

sharp(input)
  .avif({ quality: 50 })
  .toFile(output)
  .then(() => {
    console.log('Converted ' + input + ' to ' + output);
    fs.unlinkSync(input);
  })
  .catch(err => {
    console.error('Error converting:', err);
    process.exit(1);
  });
