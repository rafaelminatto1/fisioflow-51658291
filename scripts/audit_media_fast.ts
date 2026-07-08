import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function checkYoutube(url: string) {
  if (!url) return true;
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }
  
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembed);
    return res.ok;
  } catch {
    return false;
  }
}

async function checkImage(url: string) {
  if (!url) return true;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const { rows } = await client.query('SELECT id, name, "video_url", "image_url" FROM exercises WHERE "video_url" IS NOT NULL OR "image_url" IS NOT NULL;');
  console.log(`Found ${rows.length} exercises to check...`);

  const promises = rows.map(async (row) => {
    let isBroken = false;
    let cause = [];
    let videoOk = true;
    let imageOk = true;

    if (row.video_url) {
      videoOk = await checkYoutube(row.video_url);
      if (!videoOk) { isBroken = true; cause.push('video'); }
    }
    if (row.image_url) {
      imageOk = await checkImage(row.image_url);
      if (!imageOk) { isBroken = true; cause.push('image'); }
    }

    if (isBroken) {
      return { id: row.id, name: row.name, video: row.video_url, image: row.image_url, cause };
    }
    return null;
  });

  const results = await Promise.all(promises);
  const broken = results.filter(r => r !== null);

  console.log(`\nFound ${broken.length} broken exercises.`);
  fs.writeFileSync('broken_exercises.json', JSON.stringify(broken, null, 2));
  await client.end();
}

main().catch(console.error);
