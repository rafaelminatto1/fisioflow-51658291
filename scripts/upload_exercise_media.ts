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
    // Phase 4 Images - Unique exercise images
    { id: '7db917f8-3898-461f-a055-5d55b20ca8c7', file: 'cat_cow_stretch_1768479503593.png' }, // Gato-Vaca
    { id: '239e1bc5-a8f7-45c9-bd60-61b5d56f349b', file: 'wall_biceps_stretch_1768479517784.png' }, // Alongamento Bíceps Parede
    { id: '224db92d-6e32-4721-8c3c-753668b57090', file: 'supine_glute_stretch_1768479533430.png' }, // Alongamento Glúteo Supino
    { id: 'c6c42235-1dba-48bc-8505-6a55783956ea', file: 'quadriceps_standing_stretch_1768479546584.png' }, // Alongamento Quadríceps em Pé
    { id: '09a61106-323b-4716-bc12-c7bbd931ba0b', file: 'triceps_behind_stretch_1768479560106.png' }, // Alongamento Tríceps
    { id: '21aba699-3698-49d9-a98f-d7b0d58b55d2', file: 'seated_calf_stretch_1768479586314.png' }, // Alongamento Panturrilha Sentado
    { id: '7a03c9f5-99dc-405a-88ba-b4893fd0b793', file: 'rhomboid_wall_stretch_1768479601594.png' }, // Alongamento Rombóides
    { id: '53782b5c-1f5c-4fb5-9b41-f89c531a6b2d', file: 'abdominal_plank_1768479617534.png' }, // Prancha Abdominal
    { id: '575d07c7-bc3d-429c-9f04-7fdc752fb230', file: 'abdominal_plank_1768479617534.png' }, // Prancha Abdominal (duplicate)
    { id: 'b7262ed6-7e26-492e-a14c-59c7ad0e69f4', file: 'finger_coordination_1768479631705.png' }, // Coordenação Digital
    { id: '6d684cbf-b694-4dc5-98a5-9e861c4c4126', file: 'eye_hand_coordination_1768479644385.png' }, // Coordenação Óculo-Manual
    { id: 'b636b2ba-2580-4425-bd36-621bb765d94b', file: 'cross_pattern_gait_1768479672539.png' }, // Marcha Padrões Cruzados
    { id: 'f2b4628e-d77a-4914-8b8c-17e254bc0134', file: 'texture_floor_walk_1768479686632.png' }, // Tapete Pisos Diferentes
    { id: 'df9c5648-6627-49af-8a84-8fd3f0b2f9bc', file: 'unstable_disc_squat_1768479698765.png' }, // Agachamento Disco Instável
    { id: '9058e05e-b006-4b1c-bd7e-9b285b94aaba', file: 'bosu_ball_squat_1768479713156.png' }, // BOSU Ball Squat
    { id: '763de08e-c8a2-4cfa-be64-4913c77b0317', file: 'balance_disc_standing_1768479726533.png' }, // Equilíbrio Disco Instável
    { id: 'c89ba4e7-0394-47ac-a11a-bb359cac5422', file: 'unipodal_balance_1768479763859.png' }, // Equilíbrio Unipodal Solo
    { id: 'b1ac6203-b1f7-4965-aec6-ccd3e7391501', file: 'mini_landing_protocol_1768479778340.png' }, // Mini-Landing Protocol
    { id: '825b7a90-c599-40fe-8bcf-839fc1655255', file: 'proprioception_disc_1768479793104.png' }, // Propriocepção em Disco
    { id: '38d6a2e2-adc7-47cd-a7c9-550996f9a892', file: 'single_leg_arm_movement_1768479806910.png' }, // Single Leg Stance com Movimento
    { id: '437b9b5e-2cb7-4a8f-9f00-ea60a0879475', file: 'star_balance_test_1768479821423.png' }, // Star Excursion Balance Test
    { id: 'f8b620c0-a01f-4a3e-acc9-589105ad57a6', file: 'hip_abduction_standing_1768479852430.png' }, // Abdução de Quadril em Pé

    // Phase 5 Images - Strengthening, Respiratory, Mobility
    { id: '59069383-fa9c-4f8e-bb61-a1dc2601cb84', file: 'quadriceps_towel_stretch_1768502186712.png' }, // Alongamento Quadríceps Toalha
    { id: '8216eda0-2151-468e-9cd7-8efafd8d6fbd', file: 'chair_squat_exercise_1768502201179.png' }, // Agachamento na Cadeira
    { id: '580da2cd-47f3-4fd0-ba71-be29a76151a9', file: 'clamshell_exercise_1768502214650.png' }, // Clamshell
    { id: '95e06cca-7996-4004-8fdc-044c6265aa2c', file: 'dead_bug_exercise_1768502229018.png' }, // Dead Bug
    { id: '47df886c-41cd-476d-921b-e01e2881d27e', file: 'deadlift_dumbbell_1768502242765.png' }, // Deadlift Dumbbell
    { id: 'f6b2cd85-5192-4d27-864d-e4c2a2422bbf', file: 'thoracic_expansion_unilateral_1768502269961.png' }, // Expansão Torácica Unilateral
    { id: '1b6a7d2c-259d-4cd1-b1ef-43262d66fd4f', file: 'huff_cough_technique_1768502283893.png' }, // Huff Cough
    { id: 'e00e0ee3-81e5-4334-b43d-23704f360c38', file: 'breathing_478_1768502298664.png' }, // Respiração 4-7-8
    { id: '1b335a64-4349-4084-98ad-644ea7c7aded', file: 'pursed_lip_breathing_1768502312139.png' }, // Pursed Lip Breathing
    { id: 'a0e1b23d-dca0-4fc5-8dbe-2c6b1949c67a', file: 'diaphragmatic_breathing_exercise_1768502326408.png' }, // Respiração Diafragmática
    { id: 'd6e94b02-1f6c-4c08-8571-5e3d5c69054c', file: 'ankle_mobility_wall_1768502352240.png' }, // Mobilidade Tornozelo Parede
    { id: 'a0d4e677-bc5d-4e5c-bd32-658a9a532229', file: 'hip_capsular_mobility_1768502367240.png' }, // Mobilização Quadril Capsular
    { id: 'f696ced4-ad75-4b23-afe2-ecb3e4935625', file: 'ankle_dorsiflexion_mobilization_1768502382542.png' }, // Mobilização Tornozelo DF
    { id: 'adcb6539-adfc-4bb6-b46e-381ac8be63a2', file: 'patellar_mobilization_1768502399484.png' }, // Mobilização Patelar
    { id: '1d887410-7bf1-4193-b014-157b23c6f505', file: 'shoulder_rotation_towel_1768502415378.png' }, // Rotação Ombro Toalha
    { id: 'b533a956-5d7c-4ceb-b4c6-71536c540adf', file: 'slr_nerve_glide_1768502445363.png' }, // SLR Nerve Glide
    { id: '8e5c4a06-aa57-4f43-8114-b7da53c67509', file: 'thomas_test_stretch_1768502459002.png' }, // Thomas Test
    { id: 'bd8440f5-991e-45c8-9b85-6d640417d0e1', file: 'wrist_radial_deviation_1768502472269.png' }, // Desvio Radial Punho
    { id: 'e4657c8f-48b0-49c2-b200-5ade77ca86fc', file: 'jacobson_relaxation_1768502486314.png' }, // Jacobson Relaxation
    { id: '639d526a-647c-44e8-9300-4327f2dff585', file: 'global_active_stretching_1768502500158.png' }, // SGA

    // Phase 6 Images - Single generated before quota limit
    { id: '163d7788-b223-44da-92dc-188849b38342', file: 'calf_raise_step_1768502754354.png' },
    // Phase 5-7 New Additions
    { id: '0335b398-ac40-44ea-85fe-c1dfa2fc9a38', file: 'shoulder_raise_front_1768568174752.png' },
    { id: '273d04a8-34f2-44c7-a73f-566c0cbe1494', file: 'shoulder_raise_lateral_1768568187072.png' },
    { id: 'ff166d2a-3f96-48e7-aee2-d640130b09ba', file: 'wrist_extension_1768568213816.png' },
    { id: 'e1b7dc68-c03b-4088-8564-d88755e8e670', file: 'wrist_flexion_1768568225748.png' },
    { id: '3329d2c0-8d1e-46be-9490-c14b2e5fa280', file: 'glute_bridge_exercise_1768568240158.png' },
    { id: '6cc08e4c-6cc7-46ff-9806-949556ac37ba', file: 'glute_bridge_exercise_1768568240158.png' },
    { id: '21de4c3d-8fd8-4d76-9952-19b2d9238209', file: 'glute_bridge_unilateral_1768568506337.png' },
    { id: '0ffb39fe-1cf7-4277-9cf2-e52efb748ace', file: 'glute_bridge_unilateral_1768568506337.png' },
    { id: '3541df60-9b9e-4038-85d8-409c0d5304f5', file: 'calf_raise_standing_1768568432076.png' },
    { id: '98ce538b-624c-4369-b5f1-59948d45b49b', file: 'calf_raise_standing_1768568432076.png' },
    { id: '3c653228-db4f-46e7-bc61-d78457404571', file: 'calf_raise_seated_1768568446342.png' },
    { id: '29950c95-1519-403f-ba61-3ea069750f40', file: 'monster_walk_1768568487884.png' },
    { id: 'b65d5a99-7eff-45a9-9433-c5fb2abc6e8f', file: 'wall_plank_1768568520750.png' },
    { id: 'f92afdb4-ef22-44c2-84d8-8334025c4915', file: 'prone_knee_flexion_1768568474732.png' },
    { id: '765bf678-24b4-4d5d-876d-3c569e923a5d', file: 'bicep_curl_standing_1768568459328.png' },
    { id: 'eb3aef63-c24a-402d-9209-e340129869ac', file: 'shoulder_internal_rotation_resistance_1768568325535.png' },
    { id: 'c391fb48-73f8-4bdc-935c-09fce60fd525', file: 'shoulder_external_rotation_resistance_1768568309334.png' },
    { id: '0a4b1e70-34ee-4718-a2fc-c8e2597e1c15', file: 'bird_dog_exercise_1768440884296.png' },
    // Phase 11-12 New Additions (Batches 16-18)
    { id: '5d90cfeb-ea29-4c87-bbf2-3c282e502b8e', file: 'prone_ytw_1768593356210.png' },
    { id: '5818c63c-a41c-46e5-8ef2-5ae68119831e', file: 'burpee_modified_1768593372303.png' },
    { id: 'f60ff519-6a7e-453b-b469-f25136633988', file: 'farmer_walk_1768593385373.png' },
    { id: '7abed066-3b08-43d7-950e-716ea0a16508', file: 'quadriceps_stretch_standing_1768593397346.png' },
    { id: 'c683c59e-ba03-4ebe-9a90-cf61768f856b', file: 'wall_shoulder_exercise_1768593410983.png' },
    { id: 'a9a77512-1615-4f84-889e-71a0481dadd1', file: 'tricep_extension_1768593424557.png' },
    { id: 'fa2f5230-895c-4bca-8217-8d9bebe70435', file: 'tricep_extension_1768593424557.png' },
    { id: '2b45df0c-3657-400b-8230-d959f2a60dcb', file: 'finger_extension_1768593437369.png' },
    { id: 'c13843f6-32b7-4ecc-9a19-a98d165f9130', file: 'knee_extension_open_chain_1768593450247.png' },
    { id: '04a5f252-82e5-416e-b3fe-4bbbf1be7370', file: 'face_pull_1768593463104.png' },
    { id: 'ce3a7786-7b0f-4db6-8e67-a1238b668f19', file: 'leg_press_45_1768593476676.png' },
    { id: '3e36c518-0672-41ac-acd6-e043b40ddd6a', file: 'push_up_plus_1768593514718.png' },
    { id: 'c5c17d48-60d7-4bc8-ae76-1661923717df', file: 'romanian_deadlift_1768593527691.png' },
    { id: '1b53aae1-8248-4c2c-ad97-10b71d6d2a27', file: 'barbell_row_1768593542209.png' },
    { id: '61bcc16f-b1c4-491e-898a-e6d0be2a0aed', file: 'rowing_band_1768593554859.png' },
    { id: 'caab385c-60aa-4509-8e5e-5af795beaa36', file: 'ball_squeeze_1768593567123.png' },
    { id: 'fb959553-cc44-47d9-9217-392c3d29af92', file: 'box_jump_1768593580095.png' },
    { id: 'f5eb147e-c269-4b00-9e15-ea3c428dcbae', file: 'lateral_carry_1768593592770.png' },
    { id: 'aabcf71c-9234-426e-bef9-759e1286c47f', file: 'stair_descent_1768593606337.png' },
    { id: 'caca8746-0545-4876-a060-101dc614d5ba', file: 'gait_obstacles_1768593617798.png' },
    { id: 'cd66cb4b-9e85-44f1-84d9-0ca60b9462cb', file: 'lunge_rotation_1768593629842.png' },
    { id: 'd6046fa7-8a3a-4cf4-98f5-d4dc8edf7d20', file: 'squat_jump_1768593670074.png' }
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
