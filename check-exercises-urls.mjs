import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log('--- CHECKING EXERCISES URLS ---');
  try {
    const exercises = await sql`
      SELECT id, name, image_url, thumbnail_url, video_url 
      FROM exercises 
      WHERE image_url LIKE '%supabase.co%' 
         OR thumbnail_url LIKE '%supabase.co%' 
         OR video_url LIKE '%supabase.co%'
      LIMIT 10
    `;
    
    if (exercises.length === 0) {
      console.log('No exercises found with Supabase URLs.');
    } else {
      console.log(`Found ${exercises.length} exercises with Supabase URLs (limited to 10).`);
      console.table(exercises);
    }
    
    // Total count
    const count = await sql`
      SELECT COUNT(*) as total
      FROM exercises 
      WHERE image_url LIKE '%supabase.co%' 
         OR thumbnail_url LIKE '%supabase.co%' 
         OR video_url LIKE '%supabase.co%'
    `;
    console.log('Total exercises with Supabase URLs:', count[0].total);

  } catch (error) {
    console.error('Error:', error.message);
  }
}
run();
