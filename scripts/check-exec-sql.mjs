
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking for exec_sql_dynamic function...');
  const { data, error } = await supabase.rpc('exec_sql_dynamic', { sql_text: 'SELECT 1' });
  
  if (error) {
    console.error('Error calling exec_sql_dynamic:', error);
    // Try to see if it's a permission issue or not found
    if (error.code === 'PGRST202' || error.message.includes('Could not find')) {
        console.log('Function likely does not exist.');
    }
  } else {
    console.log('Success! Function exists and is callable.');
  }
}

check();
