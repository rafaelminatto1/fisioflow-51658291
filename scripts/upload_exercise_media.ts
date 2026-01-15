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
    { id: 'b8780f14-2037-4cb9-b0d5-d92222b1e296', file: 'shoulder_mobility_exercise_1768417597271.png' }, // Duplicate name ID
    // Phase 2 Images
    { id: '124c3df3-bba5-431a-87f5-c14f77fcb4b3', file: 'deadlift_exercise_1768428556929.png', name: 'Levantamento Terra' },
    { id: '9e3aa6fb-1b3c-4acd-bc32-f5adc1ad0602', file: 'deadlift_exercise_1768428556929.png', name: 'Levantamento Terra' },
    { id: '137960fc-89dd-4b2d-b972-2fe7a014e4cb', file: 'spine_mobility_exercise_1768428571231.png', name: 'Mobilidade de Coluna' },
    { id: 'e505e16a-bb39-41c8-8c4d-7dcda1fa572c', file: 'spine_mobility_exercise_1768428571231.png', name: 'Mobilidade de Coluna' },
    { id: '1b8da9f8-7f2b-4bf0-88b3-4c42f73343e0', file: 'free_squat_exercise_1768428598080.png', name: 'Agachamento Livre' },
    { id: 'ce0f4293-94cb-4f30-9bb0-f323ba8c1f28', file: 'free_squat_exercise_1768428598080.png', name: 'Agachamento Livre' },
    { id: '9fc590c6-49c7-47da-a1fa-b454fdbd43f4', file: 'free_squat_exercise_1768428598080.png', name: 'Agachamento Livre' },
    { id: 'c59164bc-13a1-41af-89c0-a4d13efc489e', file: 'lunge_exercise_1768428610424.png', name: 'Afundo Frontal (Lunge)' },
    { id: '9ddf66b7-69ca-47db-b004-0b9c7cf47382', file: 'lunge_exercise_1768428610424.png', name: 'Afundo' },
    // Phase 3 Images
    { id: '53d5f00e-a5c8-4e15-b118-9326774206db', file: 'four_point_kneeling_1768440771038.png' }, // 4 Apoios
    { id: '24d7105d-6222-4cac-b022-af486c670d07', file: 'crunch_exercise_1768440786714.png' }, // Abdominal Crupeado
    { id: 'e27d4256-c834-4e2c-845b-1dfb767c3cb2', file: 'oblique_crunch_1768440799968.png' }, // Abdominal Oblíquo
    { id: '4204a561-e640-4176-bdce-cd68ddb7b0f7', file: 'step_up_exercise_1768440814015.png' }, // Step Up
    { id: 'e15a7a53-ce3d-4811-bf69-28760da0e857', file: 'step_down_exercise_1768440829150.png' }, // Step Down
    { id: 'c9640a9f-4448-4573-8852-7e085d2cfcad', file: 'side_plank_exercise_1768440858852.png' }, // Side Plank
    { id: 'bf5122ab-fd57-47d3-b6ed-e2f081e71918', file: 'hamstring_stretch_1768440871853.png' }, // Alongamento Isquiotibiais
    { id: 'acfc8fa4-6d28-4748-bf52-5d66b787803f', file: 'hamstring_stretch_1768440871853.png' }, // Alongamento Isquiotibiais em Pé
    { id: 'd8d9d4b8-1941-4c9f-9d2d-8d9d4b8194a', file: 'bird_dog_exercise_1768440884296.png' }, // Perdigueiro (if ID valid)
    { id: 'd7548baf-4209-4c11-8bb9-c144325e7d5b', file: 'sit_to_stand_1768440897918.png' }, // Sit-to-Stand
    { id: 'e1007b01-eb24-43e4-893d-e17c2f9b565e', file: 'foam_rolling_1768440911208.png' }, // Rolling com Foam Roller
    { id: '36fba17a-19c0-425c-a1ae-8c71ca9d6f0e', file: 'adductor_stretch_1768440940033.png' }, // Alongamento de Adutores
    { id: '39f8e6d7-4df2-40c1-bf70-c999cca555bb', file: 'psoas_stretch_1768440952223.png' }, // Alongamento de Psoas
    { id: '539ed598-43b1-4b66-846f-ae3eaf89d4ee', file: 'pectoral_stretch_1768440964346.png' }, // Alongamento de Peitoral
    { id: '21787493-4e7e-42db-9ba9-d5ebf3d61c61', file: 'calf_stretch_1768440979828.png' }, // Alongamento de Panturrilha
    { id: 'b92906fa-740d-4797-b7aa-5f0fad5803ac', file: 'external_rotation_1768440992167.png' }, // Rotação Externa de Ombro
    { id: 'c391fb48-73f8-4bdc-935c-09fce60fd525', file: 'external_rotation_1768440992167.png' }, // Rotação Externa com Faixa
    { id: '668869ad-e594-4478-954f-1ef95cd9c9f5', file: 'single_leg_stance_1768441041444.png' }, // Apoio Unipodal
    { id: '68a79743-9985-40a5-bd88-585927eebafc', file: 'tandem_walk_1768441056605.png' }, // Tandem Walk
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
