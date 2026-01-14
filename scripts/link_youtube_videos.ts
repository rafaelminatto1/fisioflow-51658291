import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { YouTube } from 'youtube-sr';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function linkVideos() {
    console.log('Fetching exercises without videos...');

    // Get exercises with no video
    const { data: exercises, error } = await supabase
        .from('exercises')
        .select('id, name')
        .or('video_url.is.null,video_url.eq.""');

    if (error) {
        console.error('Error fetching exercises:', error);
        return;
    }

    console.log(`Found ${exercises.length} exercises without videos.`);

    for (const exercise of exercises) {
        try {
            console.log(`Searching for: ${exercise.name}...`);
            const video = await YouTube.searchOne(`${exercise.name} exercise`, 'video');

            if (video && video.url) {
                console.log(`Found video: ${video.title} (${video.url})`);

                const { error: updateError } = await supabase
                    .from('exercises')
                    .update({
                        video_url: video.url,
                        needs_recording: true
                    })
                    .eq('id', exercise.id);

                if (updateError) {
                    console.error(`Failed to update ${exercise.name}:`, updateError);
                } else {
                    console.log(`Updated ${exercise.name}`);
                }
            } else {
                console.warn(`No video found for ${exercise.name}`);
            }

            // Respect rate limits (simple delay)
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (err) {
            console.error(`Error processing ${exercise.name}:`, err);
        }
    }
    console.log('Done.');
}

linkVideos();
