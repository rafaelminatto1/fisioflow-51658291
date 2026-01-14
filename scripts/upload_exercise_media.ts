import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

const artifactsDir = '/home/rafael/.gemini/antigravity/brain/b1607313-7708-411e-9f8f-607debc7c869';

const images = [
    { id: '921eb62f-60f8-4f56-8364-88e291a63a33', file: 'wall_sit_exercise_1768417226798.png' },
    { id: '3e499e73-e420-404e-aa6d-3c9835bc3f14', file: 'plank_exercise_1768417243483.png' },
    { id: '35a45de4-9308-4f3a-98cf-0c34317ca652', file: 'sumo_squat_exercise_1768417258539.png' },
    { id: 'b05fa3bf-791d-47f3-b76e-217802dde886', file: 'quadriceps_stretch_exercise_1768417273522.png' },
    // New Images
    { id: '63058119-f79a-4aaf-ac42-0fb342d1df3e', file: 'glute_strengthening_exercise_1768417582810.png' },
    { id: '5fd7f81f-bb4a-47e6-bcce-c95b7fd0103b', file: 'glute_strengthening_exercise_1768417582810.png' }, // Duplicate name ID
    { id: 'de6f57be-c016-49c3-8a74-cfddfef25563', file: 'shoulder_mobility_exercise_1768417597271.png' },
    { id: 'b8780f14-2037-4cb9-b0d5-d92222b1e296', file: 'shoulder_mobility_exercise_1768417597271.png' }  // Duplicate name ID
];

async function upload() {
    console.log('Starting upload...');
    for (const img of images) {
        const filePath = path.join(artifactsDir, img.file);
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            continue;
        }
        const fileContent = fs.readFileSync(filePath);
        const fileName = `generated/${img.file}`;

        console.log(`Uploading ${img.file}...`);

        // Upload to exercise-thumbnails
        const { data, error } = await supabase.storage
            .from('exercise-thumbnails')
            .upload(fileName, fileContent, { upsert: true, contentType: 'image/png' });

        if (error) {
            console.error('Upload Error:', img.file, error);
            continue;
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('exercise-thumbnails')
            .getPublicUrl(fileName);

        console.log(`Uploaded ${img.file} to ${publicUrl}`);

        // Update DB
        const { error: dbError } = await supabase
            .from('exercises')
            .update({
                thumbnail_url: publicUrl,
                image_url: publicUrl
            })
            .eq('id', img.id);

        if (dbError) {
            console.error('DB Update Error:', img.file, dbError);
        } else {
            console.log('DB Updated for', img.id);
        }
    }
    console.log('Done.');
}

upload();
