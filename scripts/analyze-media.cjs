
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('media_dump.json', 'utf8'));
const missingVideo = data.filter(e => !e.video_url);
const brainImages = data.filter(e => e.image_url && e.image_url.includes('/brain/'));
const missingImage = data.filter(e => !e.image_url);

console.log('--- MISSING VIDEOS ---');
missingVideo.forEach(e => console.log(`- ${e.name} (${e.id})`));

console.log('\n--- BRAIN IMAGES ---');
brainImages.forEach(e => console.log(`- ${e.name}: ${e.image_url}`));

console.log('\n--- MISSING IMAGES ---');
missingImage.forEach(e => console.log(`- ${e.name} (${e.id})`));
