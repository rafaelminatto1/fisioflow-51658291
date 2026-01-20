
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or keys');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findExercises() {
    const keywords = ['agachamento', 'squat', 'cadeira'];
    console.log(`Searching for exercises with keywords: ${keywords.join(', ')}...`);

    const { data: exercises, error } = await supabase
        .from('exercises')
        .select('id, name, category')
        .or(keywords.map(k => `name.ilike.%${k}%`).join(','));

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${exercises.length} matches:`);
    exercises.forEach(e => console.log(`- ${e.name} (${e.category})`));
}

findExercises();
