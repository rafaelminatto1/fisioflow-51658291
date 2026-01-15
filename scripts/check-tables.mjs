
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

async function checkTables() {
  console.log('Checking tables...');
  // Since we don't have direct access to information_schema via anon key usually,
  // we can try to select from 'services' to see if it errors with "does not exist" or permission denied.
  
  const { error } = await supabase.from('services').select('id').limit(1);
  
  if (error) {
    console.log('Error accessing services:', error.message);
    if (error.code === '42P01') {
        console.log('Confirmed: Table services does not exist.');
    }
  } else {
    console.log('Table services exists.');
  }

  // Check for similar names
  const { error: error2 } = await supabase.from('service').select('id').limit(1);
  if (!error2) console.log('Table service exists.');

  const { error: error4 } = await supabase.from('user_organization_roles').select('id').limit(1);
  if (error4) console.log('Error accessing user_organization_roles:', error4.message);
  else console.log('Table user_organization_roles exists.');

  const { data: members, error: error5 } = await supabase.from('organization_members').select('organization_id, user_id').limit(1);
  if (error5) console.log('Error accessing organization_members columns:', error5.message);
  else {
      console.log('Columns confirmed in organization_members.');
  }
}

checkTables();
