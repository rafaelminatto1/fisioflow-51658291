import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkBroken() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const res = await client.query(`
    SELECT id, name, image_url 
    FROM exercises 
    WHERE image_url IS NULL 
       OR image_url = '' 
       OR image_url = '---'
       OR image_url LIKE '%broken%'
  `);

  console.log(`Found ${res.rows.length} broken images.`);
  if (res.rows.length > 0) {
    console.log(res.rows.slice(0, 5));
  }
  
  await client.end();
}

checkBroken().catch(console.error);
