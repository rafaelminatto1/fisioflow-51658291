import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function searchYoutubeExa(query: string) {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.EXA_API_KEY || ''
    },
    body: JSON.stringify({
      query: `exercício fisioterapia ${query} tutorial site:youtube.com`,
      numResults: 1
    })
  });
  
  if (!res.ok) {
    return null;
  }
  
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    return data.results[0].url;
  }
  return null;
}

function extractVideoId(url: string) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
  return match ? match[1] : null;
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const brokenList = JSON.parse(fs.readFileSync('broken_exercises.json', 'utf-8'));
  console.log(`Processing ${brokenList.length} broken exercises...`);
  
  let successCount = 0;
  
  const chunk = 5;
  for (let i = 0; i < brokenList.length; i += chunk) {
    const batch = brokenList.slice(i, i + chunk);
    const promises = batch.map(async (ex: any) => {
      // Skip the ones we already beautifully customized
      if (ex.name.includes("Mobilidade de Quadril") && ex.name.includes("Rotação Interna")) return;
      if (ex.name === "Flexão de Braço") return;

      const videoUrl = await searchYoutubeExa(ex.name);
      if (videoUrl) {
        const videoId = extractVideoId(videoUrl);
        if (videoId) {
          const imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          
          await client.query(`
            UPDATE exercises 
            SET "video_url" = $1, "image_url" = $2
            WHERE id = $3
          `, [videoUrl, imageUrl, ex.id]);
          
          console.log(`[OK] Updated ${ex.name} -> ${videoUrl}`);
          successCount++;
        }
      } else {
        console.log(`[SKIP] No video found for ${ex.name}`);
      }
    });
    
    await Promise.all(promises);
  }
  
  console.log(`Finished processing. Successfully updated ${successCount} exercises.`);
  await client.end();
}

main().catch(console.error);
