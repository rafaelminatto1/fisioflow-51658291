
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPatientsColumns() {
  console.log('Checking Patients table columns...');
  const { data, error } = await supabase.from('patients').select('*').limit(1);
  
  if (error) {
      console.log('Error accessing patients:', error.message);
  } else if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
  } else {
      console.log('No data in patients, hard to guess columns via select *. Trying profiles.');
      const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
      if (profiles && profiles.length > 0) {
          console.log('Profiles Columns:', Object.keys(profiles[0]));
      }
  }
}

checkPatientsColumns();
