
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const newExercises = [
    // Batch 16 - Sports Physio & Mobility Exercises
    {
        id: 'c3ba30fe-9684-463b-a7cc-565ec0650b48',
        name: 'Afundo Lateral',
        description: 'Passo lateral profundo com uma perna flexionada e outra estendida. Trabalha adutores, glúteos e quadríceps.',
        category: 'Fortalecimento',
        difficulty: 'Intermediário',
        body_parts: ['Quadril', 'Adutores', 'Quadríceps'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '91f3e5c9-ac80-48e6-8da0-0049f7fc2c35',
        name: 'Hip Airplane',
        description: 'Exercício de equilíbrio unipodal com rotação de tronco. Trabalha estabilidade de quadril e propriocepção.',
        category: 'Propriocepção',
        difficulty: 'Avançado',
        body_parts: ['Quadril', 'Core', 'Glúteos'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '2203b17a-f256-48eb-a023-53d82198e71e',
        name: 'Pallof Press',
        description: 'Pressão anti-rotacional com cabo ou elástico. Fortalece core e estabilizadores de tronco.',
        category: 'Fortalecimento',
        difficulty: 'Intermediário',
        body_parts: ['Core', 'Abdômen'],
        equipment: ['Faixa Elástica', 'Cabo'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'b6488dc0-fb26-43ee-ad99-d701bef53963',
        name: 'Stiff Unilateral',
        description: 'Levantamento terra romeno em uma perna. Trabalha isquiotibiais, glúteos e equilíbrio.',
        category: 'Fortalecimento',
        difficulty: 'Avançado',
        body_parts: ['Isquiotibiais', 'Glúteos', 'Core'],
        equipment: ['Halter'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'dc502cfe-3831-465a-b39f-bd753f403608',
        name: 'Passos Laterais com Faixa',
        description: 'Passos laterais com faixa elástica nos tornozelos. Ativa glúteo médio.',
        category: 'Fortalecimento',
        difficulty: 'Iniciante',
        body_parts: ['Glúteos', 'Quadril'],
        equipment: ['Faixa Elástica'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'e8525045-eac8-4221-a9af-17bbdd63219b',
        name: 'Rotação Torácica em 4 Apoios',
        description: 'Rotação de coluna torácica em posição quadrúpede. Melhora mobilidade de tronco.',
        category: 'Mobilidade',
        difficulty: 'Iniciante',
        body_parts: ['Coluna Torácica', 'Core'],
        equipment: ['Colchonete'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'c5e5a7b1-e695-4ac5-98f9-7b3df1fdbaab',
        name: 'Deslizamento de Calcanhar',
        description: 'Deslizar calcanhar para flexionar joelho em decúbito dorsal. Exercício pós-operatório de joelho.',
        category: 'Mobilidade',
        difficulty: 'Iniciante',
        body_parts: ['Joelho'],
        equipment: ['Colchonete'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '5d4e9e60-72c7-4646-acb6-77bfcef7869a',
        name: 'Marcha Supina de Quadril',
        description: 'Movimento de marcha alternando pernas em decúbito dorsal. Fortalece flexores de quadril.',
        category: 'Fortalecimento',
        difficulty: 'Iniciante',
        body_parts: ['Quadril', 'Core'],
        equipment: ['Colchonete'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'af498abc-e4d5-4014-8f05-d131e83e6309',
        name: 'Agachamento Búlgaro',
        description: 'Agachamento unilateral com pé traseiro elevado. Trabalha quadríceps, glúteos e equilíbrio.',
        category: 'Fortalecimento',
        difficulty: 'Avançado',
        body_parts: ['Quadríceps', 'Glúteos', 'Quadril'],
        equipment: ['Banco ou Cadeira'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'bea028c5-24f8-4f05-95fa-f9df68cfa6f8',
        name: 'Cobra Prona',
        description: 'Elevação de tronco e braços em decúbito ventral. Fortalece extensores de coluna e escápula.',
        category: 'Fortalecimento',
        difficulty: 'Iniciante',
        body_parts: ['Costas', 'Ombro'],
        equipment: ['Colchonete'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '647b66fe-d57e-41dd-8107-abe7d008a81f',
        name: 'Alongamento 90-90',
        description: 'Alongamento de rotação de quadril sentado com pernas em 90 graus. Mobilidade de quadril.',
        category: 'Mobilidade',
        difficulty: 'Intermediário',
        body_parts: ['Quadril'],
        equipment: ['Colchonete'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

async function insertdata() {
    console.log('Inserting new exercises (Batch 16)...');
    for (const exercise of newExercises) {
        const { error } = await supabase.from('exercises').upsert(exercise);
        if (error) {
            console.error('Error inserting', exercise.name, error);
        } else {
            console.log('Inserted:', exercise.name);
        }
    }
    console.log('Done inserting.');
}

insertdata();
