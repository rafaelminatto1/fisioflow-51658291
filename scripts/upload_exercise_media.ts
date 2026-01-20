import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or keys in .env');
    process.exit(1);
}

console.log('Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role' : 'Anon/Public');

const supabase = createClient(supabaseUrl, supabaseKey);

const artifactsDir = '/home/rafael/.gemini/antigravity/brain/b1607313-7708-411e-9f8f-607debc7c869';

const images = [
    { id: '921eb62f-60f8-4f56-8364-88e291a63a33', file: 'wall_sit_exercise_1768417226798.avif' },
    { id: '3e499e73-e420-404e-aa6d-3c9835bc3f14', file: 'plank_exercise_1768417243483.avif' },
    { id: '35a45de4-9308-4f3a-98cf-0c34317ca652', file: 'sumo_squat_exercise_1768417258539.avif' },
    { id: 'b05fa3bf-791d-47f3-b76e-217802dde886', file: 'quadriceps_stretch_exercise_1768417273522.avif' },
    // New Images
    { id: '63058119-f79a-4aaf-ac42-0fb342d1df3e', file: 'glute_strengthening_exercise_1768417582810.avif' },
    { id: '5fd7f81f-bb4a-47e6-bcce-c95b7fd0103b', file: 'glute_strengthening_exercise_1768417582810.avif' }, // Duplicate name ID
    { id: 'de6f57be-c016-49c3-8a74-cfddfef25563', file: 'shoulder_mobility_exercise_1768417597271.avif' },
    { id: 'b8780f14-2037-4cb9-b0d5-d92222b1e296', file: 'shoulder_mobility_exercise_1768417597271.avif' }, // Duplicate name ID
    // Phase 2 Images
    { id: '124c3df3-bba5-431a-87f5-c14f77fcb4b3', file: 'deadlift_exercise_1768428556929.avif', name: 'Levantamento Terra' },
    { id: '9e3aa6fb-1b3c-4acd-bc32-f5adc1ad0602', file: 'deadlift_exercise_1768428556929.avif', name: 'Levantamento Terra' },
    { id: '137960fc-89dd-4b2d-b972-2fe7a014e4cb', file: 'spine_mobility_exercise_1768428571231.avif', name: 'Mobilidade de Coluna' },
    { id: 'e505e16a-bb39-41c8-8c4d-7dcda1fa572c', file: 'spine_mobility_exercise_1768428571231.avif', name: 'Mobilidade de Coluna' },
    { id: '1b8da9f8-7f2b-4bf0-88b3-4c42f73343e0', file: 'free_squat_exercise_1768428598080.avif', name: 'Agachamento Livre' },
    { id: 'ce0f4293-94cb-4f30-9bb0-f323ba8c1f28', file: 'free_squat_exercise_1768428598080.avif', name: 'Agachamento Livre' },
    { id: '9fc590c6-49c7-47da-a1fa-b454fdbd43f4', file: 'free_squat_exercise_1768428598080.avif', name: 'Agachamento Livre' },
    { id: 'c59164bc-13a1-41af-89c0-a4d13efc489e', file: 'lunge_exercise_1768428610424.avif', name: 'Afundo Frontal (Lunge)' },
    { id: '9ddf66b7-69ca-47db-b004-0b9c7cf47382', file: 'lunge_exercise_1768428610424.avif', name: 'Afundo' },
    // Phase 3 Images
    { id: '53d5f00e-a5c8-4e15-b118-9326774206db', file: 'four_point_kneeling_1768440771038.avif' }, // 4 Apoios
    { id: '24d7105d-6222-4cac-b022-af486c670d07', file: 'crunch_exercise_1768440786714.avif' }, // Abdominal Crupeado
    { id: 'e27d4256-c834-4e2c-845b-1dfb767c3cb2', file: 'oblique_crunch_1768440799968.avif' }, // Abdominal Oblíquo
    { id: '4204a561-e640-4176-bdce-cd68ddb7b0f7', file: 'step_up_exercise_1768440814015.avif' }, // Step Up
    { id: 'e15a7a53-ce3d-4811-bf69-28760da0e857', file: 'step_down_exercise_1768440829150.avif' }, // Step Down
    { id: 'c9640a9f-4448-4573-8852-7e085d2cfcad', file: 'side_plank_exercise_1768440858852.avif' }, // Side Plank
    { id: 'bf5122ab-fd57-47d3-b6ed-e2f081e71918', file: 'hamstring_stretch_1768440871853.avif' }, // Alongamento Isquiotibiais
    { id: 'acfc8fa4-6d28-4748-bf52-5d66b787803f', file: 'hamstring_stretch_1768440871853.avif' }, // Alongamento Isquiotibiais em Pé
    // { id: 'd8d9d4b8-1941-4c9f-9d2d-8d9d4b8194a', file: 'bird_dog_exercise_1768440884296.avif' }, // Perdigueiro (if ID valid) - DISABLED DUE TO MALFORMED UUID
    { id: 'd7548baf-4209-4c11-8bb9-c144325e7d5b', file: 'sit_to_stand_1768440897918.avif' }, // Sit-to-Stand
    { id: 'e1007b01-eb24-43e4-893d-e17c2f9b565e', file: 'foam_rolling_1768440911208.avif' }, // Rolling com Foam Roller
    { id: '36fba17a-19c0-425c-a1ae-8c71ca9d6f0e', file: 'adductor_stretch_1768440940033.avif' }, // Alongamento de Adutores
    { id: '39f8e6d7-4df2-40c1-bf70-c999cca555bb', file: 'psoas_stretch_1768440952223.avif' }, // Alongamento de Psoas
    { id: '539ed598-43b1-4b66-846f-ae3eaf89d4ee', file: 'pectoral_stretch_1768440964346.avif' }, // Alongamento de Peitoral
    { id: '21787493-4e7e-42db-9ba9-d5ebf3d61c61', file: 'calf_stretch_1768440979828.avif' }, // Alongamento de Panturrilha
    { id: 'b92906fa-740d-4797-b7aa-5f0fad5803ac', file: 'external_rotation_1768440992167.avif' }, // Rotação Externa de Ombro
    { id: 'c391fb48-73f8-4bdc-935c-09fce60fd525', file: 'external_rotation_1768440992167.avif' }, // Rotação Externa com Faixa
    { id: '668869ad-e594-4478-954f-1ef95cd9c9f5', file: 'single_leg_stance_1768441041444.avif' }, // Apoio Unipodal
    { id: '68a79743-9985-40a5-bd88-585927eebafc', file: 'tandem_walk_1768441056605.avif' }, // Tandem Walk
    // Phase 4 Images - Unique exercise images
    { id: '7db917f8-3898-461f-a055-5d55b20ca8c7', file: 'cat_cow_stretch_1768479503593.avif' }, // Gato-Vaca
    { id: '239e1bc5-a8f7-45c9-bd60-61b5d56f349b', file: 'wall_biceps_stretch_1768479517784.avif' }, // Alongamento Bíceps Parede
    { id: '224db92d-6e32-4721-8c3c-753668b57090', file: 'supine_glute_stretch_1768479533430.avif' }, // Alongamento Glúteo Supino
    { id: 'c6c42235-1dba-48bc-8505-6a55783956ea', file: 'quadriceps_standing_stretch_1768479546584.avif' }, // Alongamento Quadríceps em Pé
    { id: '09a61106-323b-4716-bc12-c7bbd931ba0b', file: 'triceps_behind_stretch_1768479560106.avif' }, // Alongamento Tríceps
    { id: '21aba699-3698-49d9-a98f-d7b0d58b55d2', file: 'seated_calf_stretch_1768479586314.avif' }, // Alongamento Panturrilha Sentado
    { id: '7a03c9f5-99dc-405a-88ba-b4893fd0b793', file: 'rhomboid_wall_stretch_1768479601594.avif' }, // Alongamento Rombóides
    { id: '53782b5c-1f5c-4fb5-9b41-f89c531a6b2d', file: 'abdominal_plank_1768479617534.avif' }, // Prancha Abdominal
    { id: '575d07c7-bc3d-429c-9f04-7fdc752fb230', file: 'abdominal_plank_1768479617534.avif' }, // Prancha Abdominal (duplicate)
    { id: 'b7262ed6-7e26-492e-a14c-59c7ad0e69f4', file: 'finger_coordination_1768479631705.avif' }, // Coordenação Digital
    { id: '6d684cbf-b694-4dc5-98a5-9e861c4c4126', file: 'eye_hand_coordination_1768479644385.avif' }, // Coordenação Óculo-Manual
    { id: 'b636b2ba-2580-4425-bd36-621bb765d94b', file: 'cross_pattern_gait_1768479672539.avif' }, // Marcha Padrões Cruzados
    { id: 'f2b4628e-d77a-4914-8b8c-17e254bc0134', file: 'texture_floor_walk_1768479686632.avif' }, // Tapete Pisos Diferentes
    { id: 'df9c5648-6627-49af-8a84-8fd3f0b2f9bc', file: 'unstable_disc_squat_1768479698765.avif' }, // Agachamento Disco Instável
    { id: '9058e05e-b006-4b1c-bd7e-9b285b94aaba', file: 'bosu_ball_squat_1768479713156.avif' }, // BOSU Ball Squat
    { id: '763de08e-c8a2-4cfa-be64-4913c77b0317', file: 'balance_disc_standing_1768479726533.avif' }, // Equilíbrio Disco Instável
    { id: 'c89ba4e7-0394-47ac-a11a-bb359cac5422', file: 'unipodal_balance_1768479763859.avif' }, // Equilíbrio Unipodal Solo
    { id: 'b1ac6203-b1f7-4965-aec6-ccd3e7391501', file: 'mini_landing_protocol_1768479778340.avif' }, // Mini-Landing Protocol
    { id: '825b7a90-c599-40fe-8bcf-839fc1655255', file: 'proprioception_disc_1768479793104.avif' }, // Propriocepção em Disco
    { id: '38d6a2e2-adc7-47cd-a7c9-550996f9a892', file: 'single_leg_arm_movement_1768479806910.avif' }, // Single Leg Stance com Movimento
    { id: '437b9b5e-2cb7-4a8f-9f00-ea60a0879475', file: 'star_balance_test_1768479821423.avif' }, // Star Excursion Balance Test
    { id: 'f8b620c0-a01f-4a3e-acc9-589105ad57a6', file: 'hip_abduction_standing_1768479852430.avif' }, // Abdução de Quadril em Pé

    // Phase 5 Images - Strengthening, Respiratory, Mobility
    { id: '59069383-fa9c-4f8e-bb61-a1dc2601cb84', file: 'quadriceps_towel_stretch_1768502186712.avif' }, // Alongamento Quadríceps Toalha
    { id: '8216eda0-2151-468e-9cd7-8efafd8d6fbd', file: 'chair_squat_exercise_1768502201179.avif' }, // Agachamento na Cadeira
    { id: '580da2cd-47f3-4fd0-ba71-be29a76151a9', file: 'clamshell_exercise_1768502214650.avif' }, // Clamshell
    { id: '95e06cca-7996-4004-8fdc-044c6265aa2c', file: 'dead_bug_exercise_1768502229018.avif' }, // Dead Bug
    { id: '47df886c-41cd-476d-921b-e01e2881d27e', file: 'deadlift_dumbbell_1768502242765.avif' }, // Deadlift Dumbbell
    { id: 'f6b2cd85-5192-4d27-864d-e4c2a2422bbf', file: 'thoracic_expansion_unilateral_1768502269961.avif' }, // Expansão Torácica Unilateral
    { id: '1b6a7d2c-259d-4cd1-b1ef-43262d66fd4f', file: 'huff_cough_technique_1768502283893.avif' }, // Huff Cough
    { id: 'e00e0ee3-81e5-4334-b43d-23704f360c38', file: 'breathing_478_1768502298664.avif' }, // Respiração 4-7-8
    { id: '1b335a64-4349-4084-98ad-644ea7c7aded', file: 'pursed_lip_breathing_1768502312139.avif' }, // Pursed Lip Breathing
    { id: 'a0e1b23d-dca0-4fc5-8dbe-2c6b1949c67a', file: 'diaphragmatic_breathing_exercise_1768502326408.avif' }, // Respiração Diafragmática
    { id: 'd6e94b02-1f6c-4c08-8571-5e3d5c69054c', file: 'ankle_mobility_wall_1768502352240.avif' }, // Mobilidade Tornozelo Parede
    { id: 'a0d4e677-bc5d-4e5c-bd32-658a9a532229', file: 'hip_capsular_mobility_1768502367240.avif' }, // Mobilização Quadril Capsular
    { id: 'f696ced4-ad75-4b23-afe2-ecb3e4935625', file: 'ankle_dorsiflexion_mobilization_1768502382542.avif' }, // Mobilização Tornozelo DF
    { id: 'adcb6539-adfc-4bb6-b46e-381ac8be63a2', file: 'patellar_mobilization_1768502399484.avif' }, // Mobilização Patelar
    { id: '1d887410-7bf1-4193-b014-157b23c6f505', file: 'shoulder_rotation_towel_1768502415378.avif' }, // Rotação Ombro Toalha
    { id: 'b533a956-5d7c-4ceb-b4c6-71536c540adf', file: 'slr_nerve_glide_1768502445363.avif' }, // SLR Nerve Glide
    { id: '8e5c4a06-aa57-4f43-8114-b7da53c67509', file: 'thomas_test_stretch_1768502459002.avif' }, // Thomas Test
    { id: 'bd8440f5-991e-45c8-9b85-6d640417d0e1', file: 'wrist_radial_deviation_1768502472269.avif' }, // Desvio Radial Punho
    { id: 'e4657c8f-48b0-49c2-b200-5ade77ca86fc', file: 'jacobson_relaxation_1768502486314.avif' }, // Jacobson Relaxation
    { id: '639d526a-647c-44e8-9300-4327f2dff585', file: 'global_active_stretching_1768502500158.avif' }, // SGA

    // Phase 6 Images - Single generated before quota limit
    { id: '163d7788-b223-44da-92dc-188849b38342', file: 'calf_raise_step_1768502754354.avif' },
    // Phase 5-7 New Additions
    { id: '0335b398-ac40-44ea-85fe-c1dfa2fc9a38', file: 'shoulder_raise_front_1768568174752.avif' },
    { id: '273d04a8-34f2-44c7-a73f-566c0cbe1494', file: 'shoulder_raise_lateral_1768568187072.avif' },
    { id: 'ff166d2a-3f96-48e7-aee2-d640130b09ba', file: 'wrist_extension_1768568213816.avif' },
    { id: 'e1b7dc68-c03b-4088-8564-d88755e8e670', file: 'wrist_flexion_1768568225748.avif' },
    { id: '3329d2c0-8d1e-46be-9490-c14b2e5fa280', file: 'glute_bridge_exercise_1768568240158.avif' },
    { id: '6cc08e4c-6cc7-46ff-9806-949556ac37ba', file: 'glute_bridge_exercise_1768568240158.avif' },
    { id: '21de4c3d-8fd8-4d76-9952-19b2d9238209', file: 'glute_bridge_unilateral_1768568506337.avif' },
    { id: '0ffb39fe-1cf7-4277-9cf2-e52efb748ace', file: 'glute_bridge_unilateral_1768568506337.avif' },
    { id: '3541df60-9b9e-4038-85d8-409c0d5304f5', file: 'calf_raise_standing_1768568432076.avif' },
    { id: '98ce538b-624c-4369-b5f1-59948d45b49b', file: 'calf_raise_standing_1768568432076.avif' },
    { id: '3c653228-db4f-46e7-bc61-d78457404571', file: 'calf_raise_seated_1768568446342.avif' },
    { id: '29950c95-1519-403f-ba61-3ea069750f40', file: 'monster_walk_1768568487884.avif' },
    { id: 'b65d5a99-7eff-45a9-9433-c5fb2abc6e8f', file: 'wall_plank_1768568520750.avif' },
    { id: 'f92afdb4-ef22-44c2-84d8-8334025c4915', file: 'prone_knee_flexion_1768568474732.avif' },
    { id: '765bf678-24b4-4d5d-876d-3c569e923a5d', file: 'bicep_curl_standing_1768568459328.avif' },
    { id: 'eb3aef63-c24a-402d-9209-e340129869ac', file: 'shoulder_internal_rotation_resistance_1768568325535.avif' },
    { id: 'c391fb48-73f8-4bdc-935c-09fce60fd525', file: 'shoulder_external_rotation_resistance_1768568309334.avif' },
    { id: '0a4b1e70-34ee-4718-a2fc-c8e2597e1c15', file: 'bird_dog_exercise_1768440884296.avif' },
    // Phase 11-12 New Additions (Batches 16-18)
    { id: '5d90cfeb-ea29-4c87-bbf2-3c282e502b8e', file: 'prone_ytw_1768593356210.avif' },
    { id: '5818c63c-a41c-46e5-8ef2-5ae68119831e', file: 'burpee_modified_1768593372303.avif' },
    { id: 'f60ff519-6a7e-453b-b469-f25136633988', file: 'farmer_walk_1768593385373.avif' },
    { id: '7abed066-3b08-43d7-950e-716ea0a16508', file: 'quadriceps_stretch_standing_1768593397346.avif' },
    { id: 'c683c59e-ba03-4ebe-9a90-cf61768f856b', file: 'wall_shoulder_exercise_1768593410983.avif' },
    { id: 'a9a77512-1615-4f84-889e-71a0481dadd1', file: 'tricep_extension_1768593424557.avif' },
    { id: 'fa2f5230-895c-4bca-8217-8d9bebe70435', file: 'tricep_extension_1768593424557.avif' },
    { id: '2b45df0c-3657-400b-8230-d959f2a60dcb', file: 'finger_extension_1768593437369.avif' },
    { id: 'c13843f6-32b7-4ecc-9a19-a98d165f9130', file: 'knee_extension_open_chain_1768593450247.avif' },
    { id: '04a5f252-82e5-416e-b3fe-4bbbf1be7370', file: 'face_pull_1768593463104.avif' },
    { id: 'ce3a7786-7b0f-4db6-8e67-a1238b668f19', file: 'leg_press_45_1768593476676.avif' },
    { id: '3e36c518-0672-41ac-acd6-e043b40ddd6a', file: 'push_up_plus_1768593514718.avif' },
    { id: 'c5c17d48-60d7-4bc8-ae76-1661923717df', file: 'romanian_deadlift_1768593527691.avif' },
    { id: '1b53aae1-8248-4c2c-ad97-10b71d6d2a27', file: 'barbell_row_1768593542209.avif' },
    { id: '61bcc16f-b1c4-491e-898a-e6d0be2a0aed', file: 'rowing_band_1768593554859.avif' },
    { id: 'caab385c-60aa-4509-8e5e-5af795beaa36', file: 'ball_squeeze_1768593567123.avif' },
    { id: 'fb959553-cc44-47d9-9217-392c3d29af92', file: 'box_jump_1768593580095.avif' },
    { id: 'f5eb147e-c269-4b00-9e15-ea3c428dcbae', file: 'lateral_carry_1768593592770.avif' },
    { id: 'aabcf71c-9234-426e-bef9-759e1286c47f', file: 'stair_descent_1768593606337.avif' },
    { id: 'caca8746-0545-4876-a060-101dc614d5ba', file: 'gait_obstacles_1768593617798.avif' },
    { id: 'cd66cb4b-9e85-44f1-84d9-0ca60b9462cb', file: 'lunge_rotation_1768593629842.avif' },
    { id: 'd6046fa7-8a3a-4cf4-98f5-d4dc8edf7d20', file: 'squat_jump_1768593670074.avif' },
    // Phase 13 FINAL BATCH (Mobility & Remaining) - CORRECTED
    { id: '0b6a0d0e-aed9-4300-b0a2-b739e768ec13', file: 'prona_shoulder_extension_1768622457672.avif' },
    { id: '63058119-f79a-4aaf-ac42-0fb342d1df3e', file: 'glute_kickback_mat_1768622470807.avif' },
    { id: '5fd7f81f-bb4a-47e6-bcce-c95b7fd0103b', file: 'glute_kickback_mat_1768622470807.avif' },
    { id: '5096ca7d-787b-4c96-8f6d-0f77b4266e6d', file: 'stair_climb_1768622629987.avif' },
    { id: 'adb7373b-bfae-4ca6-ad4a-6f26851a6e3b', file: 'codman_pendular_1768622642881.avif' },
    { id: 'b5e67932-ac7a-40c2-8b2f-9973fcf26f7f', file: 'hip_flexion_broom_1768622656634.avif' },
    { id: '69dd4f63-d7e1-46d2-9383-a98af2639578', file: 'cat_camel_1768622671230.avif' },
    { id: '286a7f27-9989-4504-8812-50c31cfd9468', file: 'cervical_towel_mobilization_1768622684001.avif' },
    { id: '7d9dd2cc-eaf7-43bc-a6ef-4d9ee5b05647', file: 'thoracic_foam_roller_1768622696628.avif' },
    { id: 'd509897f-7126-45c1-937f-707e409b128e', file: 'sciatic_slump_1768622710022.avif' },
    { id: 'f57b18d2-5da8-4d34-9c3c-6fc4d1df3fd1', file: 'median_nerve_1768622723706.avif' },
    { id: '4e87539c-3199-4aec-ae20-4749e80ea055', file: 'ulnar_nerve_1768622738036.avif' },
    { id: '36562767-4169-4997-987d-480f48d77aca', file: 'shoulder_mobility_stick_1768622484332.avif' },
    { id: '64391fd6-e533-495d-bd98-aff25dabf8ff', file: 'incentive_spirometry_1768622497509.avif' },
    { id: '4b1e716a-a0ff-4e8c-a69f-14b53234f011', file: 'costal_breathing_1768622511228.avif' },
    // Fix for missed Wall Slides ID
    { id: '9a6d787c-9975-4b28-81f6-797dbe7ae58c', file: 'wall_shoulder_exercise_1768593410983.avif' },
    // Phase 14: New Exercises (Batch 21 Partial)
    { id: 'ef9809ab-8ed8-4054-a7a8-126aa530a9dc', file: 'lateral_shuffle_1768825431053.avif' },
    { id: 'a1545d00-8aed-4ba7-812a-83470b38edc8', file: 'shadow_boxing_1768825445465.avif' },

    // Re-generated Exercises (Batch 14)
    { id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', file: 'bird_dog_re_gen_1768658515939.avif' }, // Perdigueiro (Update with NEW UUID)
    { id: '04a5f252-82e5-416e-b3fe-4bbbf1be7370', file: 'face_pull_re_gen_1768658530579.avif' }, // Face Pull (Update)
    { id: '68a79743-9985-40a5-bd88-585927eebafc', file: 'tandem_walk_re_gen_1768658560361.avif' }, // Tandem Walk (Update)
    { id: '8216eda0-2151-468e-9cd7-8efafd8d6fbd', file: 'squat_support_gen_1768658545704.avif' }, // Agachamento com Suporte (Update Chair Squat as Proxy)

    // New Sports Physio & Mobility Exercises (Batch 15)
    { id: 'e381977a-2726-47ef-b66b-c28f8079fff2', file: 'nordic_curl_gen_1768658585928.avif' }, // Nordic Hamstring Curl
    { id: 'dc5176c2-cd8c-4548-9eab-025d52163e16', file: 'copenhagen_plank_gen_1768658598876.avif' }, // Copenhagen Plank
    { id: '48faaf03-3626-4ecb-9c33-6d2a244618e1', file: 'scorpion_stretch_gen_1768658612976.avif' }, // Scorpion Stretch
    { id: 'a8afa48a-77cc-40df-b23d-cf61f343a206', file: 'worlds_greatest_stretch_gen_1768658626743.avif' }, // World's Greatest Stretch

    // Batch 16 - Sports Physio & Mobility Exercises
    { id: 'c3ba30fe-9684-463b-a7cc-565ec0650b48', file: 'lateral_lunge_gen_1768668118556.avif' }, // Afundo Lateral
    { id: '91f3e5c9-ac80-48e6-8da0-0049f7fc2c35', file: 'hip_airplane_gen_1768668131752.avif' }, // Hip Airplane
    { id: '2203b17a-f256-48eb-a023-53d82198e71e', file: 'pallof_press_gen_1768668144969.avif' }, // Pallof Press
    { id: 'b6488dc0-fb26-43ee-ad99-d701bef53963', file: 'single_leg_rdl_gen_1768668172225.avif' }, // Stiff Unilateral
    { id: 'dc502cfe-3831-465a-b39f-bd753f403608', file: 'banded_side_step_gen_1768668186551.avif' }, // Passos Laterais com Faixa
    { id: 'e8525045-eac8-4221-a9af-17bbdd63219b', file: 'thoracic_rotation_gen_1768668202093.avif' }, // Rotação Torácica em 4 Apoios
    { id: 'c5e5a7b1-e695-4ac5-98f9-7b3df1fdbaab', file: 'heel_slides_gen_1768668215847.avif' }, // Deslizamento de Calcanhar
    { id: '5d4e9e60-72c7-4646-acb6-77bfcef7869a', file: 'hip_flexor_march_gen_1768668241596.avif' }, // Marcha Supina de Quadril
    { id: 'af498abc-e4d5-4014-8f05-d131e83e6309', file: 'split_squat_gen_1768668256430.avif' }, // Agachamento Búlgaro
    { id: 'bea028c5-24f8-4f05-95fa-f9df68cfa6f8', file: 'prone_cobra_gen_1768668270472.avif' }, // Cobra Prona
    { id: '647b66fe-d57e-41dd-8107-abe7d008a81f', file: '90_90_stretch_gen_1768668286262.avif' }, // Alongamento 90-90

    // Batch 17 - Functional, Rehab & Streching Exercises
    { id: 'e20291a1-cec4-4bcc-84f2-86a297f6071c', file: 'reverse_lunge_gen_1768668624102.avif' }, // Afundo Reverso
    { id: '466cacb6-905a-48ff-a507-c6575797901a', file: 'goblet_squat_gen_1768761647382.avif' }, // Agachamento Goblet
    { id: '488d2447-2832-4bb4-9e17-ef65768ecfb2', file: 'hip_circles_gen_1768761659971.avif' }, // Círculos de Quadril
    { id: '534b4eaf-6718-4d58-9d2d-71a1c46febb1', file: 'supermans_gen_1768761674210.avif' }, // Superman
    { id: 'f5d77fd6-6776-4faf-b1c4-286bf77f55f6', file: 'wall_pushup_gen_1768761699971.avif' }, // Flexão de Braço na Parede
    { id: '1b06d13a-7fe3-4197-9419-746f3f61cf17', file: 'piriformis_stretch_gen_1768761714782.avif' }, // Alongamento de Piriforme
    { id: 'caa06c44-7786-4344-be88-73a2abc80767', file: 'hamstring_towel_stretch_gen_1768761726955.avif' }, // Alongamento Isquiotibiais com Toalha
    { id: '3b963b28-4647-4367-88ec-7edd221294c4', file: 'childs_pose_gen_1768761741837.avif' }, // Postura da Criança
    { id: 'a13b1d82-e0e3-4240-9104-92d775ee5a83', file: 'wrist_pronation_supination_gen_1768761756286.avif' }, // Pronação e Supinação de Punho

    // Batch 18 - Upper Body & Functional
    { id: '3345bb1e-cfc0-4ff3-a9c3-cbc162d8827a', file: 'tricep_dips_chair_gen_1768762574101.avif' }, // Mergulho no Banco
    { id: 'b438432e-f4d0-45fc-9e13-2c1306db9dad', file: 'incline_pushup_gen_1768762588446.avif' }, // Flexão Inclinada
    { id: 'a15530ef-7276-4450-a307-c3e126c14117', file: 'calf_raise_standing_gen_1768762604104.avif' }, // Elevação de Panturrilha em Pé
    { id: 'd3f4d506-f735-44bc-a7c1-2b4cce5627f8', file: 'side_lying_leg_raise_gen_1768762617356.avif' }, // Abdução de Quadril Deitado
    { id: 'c2d217e3-53dc-44d7-9c8d-35991df844c5', file: 'neck_lateral_stretch_gen_1768762631890.avif' }, // Alongamento Lateral de Pescoço
    { id: '91624a88-fed9-45fe-8d39-1a277aea225e', file: 'doorway_pec_stretch_gen_1768762645519.avif' }, // Alongamento de Peitoral na Porta
    { id: '78dd3222-a05b-4f27-b1fa-35b892941356', file: 'seated_row_band_gen_1768762674734.avif' }, // Remada Sentada com Faixa
    { id: 'b03643e1-47f7-4eeb-9bc7-de2fbd5a332e', file: 'tandem_stance_gen_1768762687852.avif' }, // Equilíbrio em Tandem

    // Batch 19 - Hand, Wrist, Neck & Nerve
    { id: 'f0ce84fc-23c3-4b47-944a-4725736db1e6', file: 'wrist_dev_radial_gen_1768784150745.avif' }, // Desvio Radial
    { id: 'ebee5a64-2f53-40c3-a253-6a5ae2115e3a', file: 'finger_opposition_gen_1768784165183.avif' }, // Oposição de Dedos
    { id: '6879381c-1a8e-4e29-ba62-1815d0f9f1ff', file: 'tendon_glides_gen_1768784178123.avif' }, // Deslizamento de Tendões
    { id: 'd0037281-3256-4ffc-9d5a-b57c6820d83d', file: 'ball_squeeze_gen_1768784190358.avif' }, // Fortalecimento de Preensão
    { id: '5456ed6b-eef0-49ee-aa0d-1cb94eaf917c', file: 'scapular_retraction_gen_1768784203782.avif' }, // Retração Escapular
    { id: '316b65ac-6d73-4c1f-a7a8-1024b8f4f358', file: 'corner_stretch_gen_1768784216939.avif' }, // Alongamento de Peitoral no Canto
    { id: '36267e08-f5db-4661-a30e-e8e42404412d', file: 'levator_scap_stretch_gen_1768784233714.avif' }, // Alongamento Levantador da Escápula
    { id: '74df06c3-97fa-4448-b8d5-0a35438cb801', file: 'upper_trap_stretch_gen_1768784249284.avif' }, // Alongamento Trapézio Superior
    { id: '3ccfbaba-3c89-419e-a07c-ce98b801d967', file: 'chin_tucks_gen_1768784263012.avif' }, // Chin Tucks
    { id: '37c791cb-bb4a-4ca4-ac6e-b104b6fa4a1b', file: 'nerve_glide_median_gen_1768784275596.avif' }, // Deslizamento do Nervo Mediano

    // Batch 20 - Ankle, Foot & Dynamic Stability
    { id: 'e02bff6b-114e-4921-8ec5-f67ba50940cb', file: 'short_foot_exercise_gen_1768784976204.avif' }, // Exercício do Pé Curto
    { id: '4ab0a36d-7510-4421-b182-6acd88bb730b', file: 'towel_scrunches_gen_1768784989195.avif' }, // Preensão de Toalha
    { id: 'cf1e55c0-1f7f-40c8-b7b8-5e5f46aba86e', file: 'ankle_eversion_band_gen_1768785002735.avif' }, // Eversão de Tornozelo
    { id: '2c7f07f5-8cbd-4ee8-a184-cf4e48802087', file: 'ankle_inversion_band_gen_1768785014502.avif' }, // Inversão de Tornozelo
    { id: '9c2e9feb-4c19-4130-82f3-e08cb77afa84', file: 'single_leg_foam_gen_1768785577486.avif' }, // Equilíbrio Unipodal Disco
    { id: 'cee7cd8a-6f76-400f-b2b8-28de44ab1581', file: 'y_balance_reach_gen_1768785595329.avif' }, // Alcance em Y
    { id: '291e3c43-de1d-46c6-af15-c341e9cf02b5', file: 'skater_hops_gen_1768785609412.avif' }, // Saltos Laterais
    { id: '4530460e-55e5-431f-bf78-5e8966569b23', file: 'step_down_control_gen_1768785624071.avif' }, // Descida Controlada
    { id: 'dd5d26aa-c593-4030-8c77-3a468983b98f', file: 'big_toe_mobility_gen_1768785638435.avif' }, // Mobilidade do Hálux
    { id: '3c72fabd-7eae-4e43-8c6a-22ae0b8ff387', file: 'soleus_stretch_wall_gen_1768785651519.avif' }, // Alongamento de Sóleo

    // Batch 21 - Plyometrics & Advanced Core
    { id: '9fa43615-8b6e-49cc-ad58-577298bfa2dd', file: 'depth_jump_gen_1768789383206.avif' }, // Depth Jump - Generated
    { id: 'd6042be1-f9e7-443c-aa79-39e64960f113', file: 'single_leg_box_jump_gen_1768820569698.avif' }, // Salto Unilateral na Caixa
    { id: '95dd2a2c-5fe2-40ed-b57d-ace308a859cf', file: 'broad_jump_gen_1768820584384.avif' }, // Salto Horizontal
    { id: '3a914408-ff33-4924-a853-9a833151463c', file: 'tuck_jump_gen_1768820599504.avif' }, // Tuck Jump
    { id: '1b2fed47-b1f8-4caa-9200-43664eb9deeb', file: 'med_ball_slam_gen_1768820613893.avif' }, // Medicine Ball Slam
    { id: 'bf9fd47a-e046-4f63-9565-b1bc49f7db87', file: 'hanging_leg_raise_gen_1768820628800.avif' }, // Elevação de Pernas na Barra
    { id: '49b385fb-7f5f-444b-b749-58e2c5195bea', file: 'ab_wheel_rollout_gen_1768820642865.avif' }, // Ab Wheel Rollout
    { id: 'a4759e6b-2570-49cd-97a7-9b48a8b211bc', file: 'hollow_rock_gen_1768820657455.avif' }, // Hollow Rock
    { id: '7ddcb9f0-daf5-4921-b29f-7a81faca8014', file: 'v_up_exercise_gen_1768820672556.avif' }, // V-Up
    { id: '85cb38c0-d365-41fe-893c-35093cb2d6f8', file: 'l_sit_gen_1768820686881.avif' }, // L-Sit

    // Batch 22 - Cardio Adaptado & Agilidade
    { id: 'fdf0361a-b2f6-48ef-8be3-b35f51be3b6f', file: 'stepping_jacks_gen_1768820700928.avif' }, // Polichinelo Adaptado
    { id: 'd25f2891-9c91-4b06-b5d5-a965ca657350', file: 'high_knees_march_gen_1768820724799.avif' }, // Marcha Estacionária Alta
    { id: 'a1545d00-8aed-4ba7-812a-83470b38edc8', file: 'shadow_boxing_gen_1768820738489.avif' }, // Boxe de Sombra
    { id: '75f5f09d-3010-4615-9a15-73f41f0c05a5', file: 'squat_punch_gen_1768820753787.avif' }, // Agachamento com Soco
    { id: 'ef9809ab-8ed8-4054-a7a8-126aa530a9dc', file: 'lateral_shuffle_gen_1768820769599.avif' }, // Deslocamento Lateral
    { id: '45803b1d-30ca-400e-ad2f-df7e266729ce', file: 'cross_crawl_gen_1768820784162.avif' }, // Coordenação Cruzada
    { id: '8ff5fa14-835c-4a25-b82c-d642782be9f4', file: 'wall_climber_gen_1768820800501.avif' }, // Escalada na Parede
    { id: '44df23a0-a4be-4cc3-8e6f-e5aaaefb5d82', file: 'imaginary_jump_rope_gen_1768820815347.avif' }, // Pular Corda Imaginária
    { id: 'ff68b19a-3e01-41fe-aa5a-88b1451f6c7d', file: 'step_touch_arms_gen_1768820830506.avif' }, // Step Touch com Braços
    { id: 'ce4cad36-c3d9-42f6-8a55-82513a6567f1', file: 'heel_flicks_gen_1768820844797.avif' }, // Heel Flicks

    // Batch 23 - Duplicate Resolutions (Unique Images)
    { id: '3329d2c0-8d1e-46be-9490-c14b2e5fa280', file: 'glute_bridge_bilateral_variant_1768917629658.avif' }, // Ponte de Glúteo Bilateral
    { id: '3541df60-9b9e-4038-85d8-409c0d5304f5', file: 'calf_raise_standing_variant_1768917650017.avif' }, // Elevação de Panturrilha em Pé
    { id: 'c59164bc-13a1-41af-89c0-a4d13efc489e', file: 'forward_lunge_variant_1768917715699.avif' }, // Afundo Frontal
    { id: '9a6d787c-9975-4b28-81f6-797dbe7ae58c', file: 'wall_shoulder_retraction_1768917741557.avif' }, // Mobilização de Escápula (Wall Slides)

    // Batch 24 - Post-Op & Sports (User Request)
    { id: '1bc9cced-333a-45fe-a1b6-b6cf7d286b83', file: 'ankle_pumps_post_op_1768920762499.avif' }, // Ankle Pumps (Bombinha)
    { id: 'cbd26ac9-91ed-43a6-81fc-f32eae722cfe', file: 'quad_sets_isometric_post_op_1768920780872.avif' }, // Isometria de Quadríceps (Quad Sets)
    { id: 'befcc012-1f46-4252-b429-a56e0c1ed8ca', file: 'slr_strength_post_op_1768920800735.avif' }, // Elevação de Perna Retificada (SLR)
    { id: '797ac2aa-583d-41a6-a73e-2aa200e4d304', file: 'short_arc_quads_post_op_1768921154515.avif' }, // Quadríceps Arco Curto
    { id: '53a9efd3-2290-4422-8714-d80ce013d2b9', file: 'single_leg_hop_landing_sports_1768921171501.avif' }, // Salto Unipodal com Aterrissagem
    { id: '3aa3a675-8e0a-45c2-9675-f4eece5ee8d9', file: 'lateral_bound_sports_1768921190178.avif' }, // Salto Lateral (Lateral Bound)

    // Phase 20 - Upper Extremity & Cervical (Final Batch)
    { id: '1e4bbe8d-ac6e-4639-bc74-5d0de50998b0', file: 'wrist_extension_dumbbell_ortho_1768923874460.avif' }, // Extensão de Punho com Halter
    { id: 'e7d2ae17-25cf-4142-9ec3-603faea6a7cf', file: 'wrist_flexion_dumbbell_ortho_1768923890420.avif' }, // Flexão de Punho com Halter
    { id: 'a2d12c5a-8098-42e0-ba8e-6e8689248620', file: 'wrist_supination_pronation_hammer_1768923911585.avif' }, // Pronação e Supinação com Peso
    { id: 'a53d2a2e-90df-4e12-99d9-c34a687445ef', file: 'towel_twist_exercise_ortho_1768923977270.avif' }, // Torção de Toalha (Grip)
    { id: '02b467a9-564e-4a18-bbf5-8150154f50e0', file: 'cervical_isometric_extension_ortho_1768924022945.avif' }, // Isometria Cervical (Extensão)
    { id: 'd83ab396-b53a-4983-8dd9-ba91994453ad', file: 'cervical_isometric_side_flexion_ortho_1768924046187.avif' }, // Isometria Cervical (Inclinção Lateral)
    { id: '13b4fac7-40e7-44d7-878d-d7613a9468bf', file: 'chin_tuck_head_lift_ortho_1768924061527.avif' } // Chin Tuck com Elevação (Head Lift)
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
            .upload(fileName, fileContent, { upsert: true, contentType: 'image/avif', cacheControl: '31536000' });

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
