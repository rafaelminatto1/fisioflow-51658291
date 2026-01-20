
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
        name: 'Ankle Pumps (Bombinha)',
        category: 'Pós-Operatório',
        description: 'Movimentação ativa do tornozelo para cima e para baixo. Essencial para prevenção de TVP.',
        image_key: 'ankle_pumps_post_op_1768920762499.png'
    },
    {
        name: 'Isometria de Quadríceps (Quad Sets)',
        category: 'Pós-Operatório',
        description: 'Contrair o músculo da coxa pressionando o joelho contra a cama/rolo.',
        image_key: 'quad_sets_isometric_post_op_1768920780872.png'
    },
    {
        name: 'Elevação de Perna Retificada (SLR)',
        category: 'Pós-Operatório',
        description: 'Elevar a perna estendida até 45 graus, mantendo o joelho travado.',
        image_key: 'slr_strength_post_op_1768920800735.png'
    },
    {
        name: 'Quadríceps Arco Curto',
        category: 'Pós-Operatório',
        description: 'Extensão terminal do joelho sobre um rolo.',
        image_key: 'short_arc_quads_post_op_1768921154515.png'
    },
    {
        name: 'Salto Unipodal com Aterrissagem',
        category: 'Esportivo',
        description: 'Saltar e aterrissar em uma perna só, focando no alinhamento do joelho.',
        image_key: 'single_leg_hop_landing_sports_1768921171501.png'
    },
    {
        name: 'Salto Lateral (Lateral Bound)',
        category: 'Esportivo',
        description: 'Saltar lateralmente de uma perna para a outra com estabilização.',
        image_key: 'lateral_bound_sports_1768921190178.png'
    }
];

async function insertExercises() {
    console.log('Inserting new exercises...');

    // Check if they exist first to avoid duplicates (by name)
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

    if (toInsert.length === 0) {
        console.log('All exercises already exist.');
    } else {
        const { data, error } = await supabase
            .from('exercises')
            .insert(toInsert)
            .select();

        if (error) {
            console.error('Error inserting:', error);
        } else {
            console.log('Inserted:', data.length);
        }
    }

    // Now get IDs for specific image mapping
    console.log('\n--- ID Mapping for Upload Script ---');
    for (const ex of newExercises) {
        const { data } = await supabase.from('exercises').select('id').eq('name', ex.name).single();
        if (data) {
            console.log(`{ id: '${data.id}', file: '${ex.image_key}' }, // ${ex.name}`);
        }
    }
}

insertExercises();
