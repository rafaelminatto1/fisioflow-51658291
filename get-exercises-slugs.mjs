import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const exercises = await sql`
      SELECT id, name, slug, image_url, thumbnail_url
      FROM exercises 
      WHERE image_url LIKE '%supabase.co%' 
         OR thumbnail_url LIKE '%supabase.co%'
    `;
    
    console.log(JSON.stringify(exercises, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}
run();
