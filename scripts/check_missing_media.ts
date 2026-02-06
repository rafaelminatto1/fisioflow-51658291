

// Load environment variables

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

// Credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or keys in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMissingMedia() {
    console.log('Checking for exercises with missing media...');

    const { data: exercises, error } = await supabase
        .from('exercises')
        .select('id, name, category, image_url, thumbnail_url, video_url')
        .order('category');

    if (error) {
        console.error('Error fetching exercises:', error);
        return;
    }

    const missingImages = exercises.filter(e => !e.image_url || e.image_url === '' || e.image_url.includes('placeholder'));
    const missingThumbnails = exercises.filter(e => !e.thumbnail_url || e.thumbnail_url === '');
    // const missingVideos = exercises.filter(e => !e.video_url || e.video_url === '');

    console.log(`\nTotal Exercises: ${exercises.length}`);
    console.log(`Missing/Placeholder Images: ${missingImages.length}`);
    console.log(`Missing Thumbnails: ${missingThumbnails.length}`);
    // console.log(`Missing Videos: ${missingVideos.length}`);

    if (missingImages.length > 0) {
        console.log('\n--- Exercises Missing Images ---');
        missingImages.forEach(e => {
            console.log(`[${e.category}] ${e.name} (ID: ${e.id})`);
        });
    }

    if (missingThumbnails.length > 0) {
        console.log('\n--- Exercises Missing Thumbnails (but have Image) ---');
        // Only show those that HAVE an image but NO thumbnail (likely need sync)
        const specificMissing = missingThumbnails.filter(t => !missingImages.find(i => i.id === t.id));
        specificMissing.forEach(e => {
            console.log(`[${e.category}] ${e.name} (ID: ${e.id}) - Has Image: ${!!e.image_url}`);
        });
        if (specificMissing.length === 0) console.log('None (All missing thumbnails also look like missing images)');
    }
}

checkMissingMedia();
