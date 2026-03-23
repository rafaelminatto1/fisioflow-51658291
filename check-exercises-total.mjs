import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const res = await sql`SELECT COUNT(*) as total FROM exercises`;
    console.log('Total exercises in database:', res[0].total);
    
    const supabaseCount = await sql`
      SELECT COUNT(*) as total 
      FROM exercises 
      WHERE image_url LIKE '%supabase.co%' 
         OR thumbnail_url LIKE '%supabase.co%'
    `;
    console.log('Exercises with Supabase URLs:', supabaseCount[0].total);
    
    const others = await sql`
      SELECT id, name, image_url 
      FROM exercises 
      WHERE image_url NOT LIKE '%supabase.co%' 
         OR image_url IS NULL
      LIMIT 5
    `;
    console.table(others);

  } catch (error) {
    console.error('Error:', error.message);
  }
}
run();
