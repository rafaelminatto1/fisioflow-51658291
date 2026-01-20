
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const newExercises = [
    {
        name: 'Extensão de Punho com Halter',
        category: 'Cotovelo/Punho',
        description: 'Fortalecimento de extensores do punho com peso livre. Apoie o antebraço e levante a mão para cima.',
        image_key: 'wrist_extension_dumbbell_ortho_1768923874460.avif'
    },
    {
        name: 'Flexão de Punho com Halter',
        category: 'Cotovelo/Punho',
        description: 'Fortalecimento de flexores do punho. Apoie o antebraço com a palma para cima e flexione o punho.',
        image_key: 'wrist_flexion_dumbbell_ortho_1768923890420.avif'
    },
    {
        name: 'Pronação e Supinação com Peso',
        category: 'Cotovelo/Punho',
        description: 'Rotação do antebraço segurando um peso assimétrico (ex: martelo) para fortalecer pronadores e supinadores.',
        image_key: 'wrist_supination_pronation_hammer_1768923911585.avif'
    },
    {
        name: 'Torção de Toalha (Grip)',
        category: 'Cotovelo/Punho',
        description: 'Fortalecimento de preensão manual e estabilização de punho através da torção de uma toalha.',
        image_key: 'towel_twist_exercise_ortho_1768923977270.avif'
    },
    {
        name: 'Isometria Cervical (Extensão)',
        category: 'Coluna Cervical',
        description: 'Empurrar a cabeça para trás contra a resistência das próprias mãos, sem realizar movimento.',
        image_key: 'cervical_isometric_extension_ortho_1768924022945.avif'
    },
    {
        name: 'Isometria Cervical (Inclinção Lateral)',
        category: 'Coluna Cervical',
        description: 'Empurrar a cabeça lateralmente contra a mão, mantendo o pescoço alinhado.',
        image_key: 'cervical_isometric_side_flexion_ortho_1768924046187.avif'
    },
    {
        name: 'Chin Tuck com Elevação (Head Lift)',
        category: 'Coluna Cervical',
        description: 'Fortalecimento dos flexores profundos do pescoço. Realizar o "queixo duplo" e elevar levemente a cabeça.',
        image_key: 'chin_tuck_head_lift_ortho_1768924061527.avif'
    }
];

async function insertExercises() {
    console.log('Inserting Phase 20 exercises...');

    const { data: existing } = await supabase
        .from('exercises')
        .select('name');

    const existingNames = new Set(existing?.map(e => e.name));

    const toInsert = newExercises.filter(e => !existingNames.has(e.name)).map(e => ({
        name: e.name,
        category: e.category,
        description: e.description,
        video_url: '' // placeholder
    }));

    if (toInsert.length > 0) {
        const { data, error } = await supabase.from('exercises').insert(toInsert).select();
        if (error) console.error('Error inserting:', error);
        else console.log('Inserted:', data.length);
    } else {
        console.log('All exercises already exist.');
    }

    console.log('\n--- ID Mapping for Upload Script ---');
    for (const ex of newExercises) {
        const { data } = await supabase.from('exercises').select('id').eq('name', ex.name).single();
        if (data) {
            console.log(`{ id: '${data.id}', file: '${ex.image_key}' }, // ${ex.name}`);
        }
    }
}

insertExercises();
