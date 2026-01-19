
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
    // Batch 22 - Cardio Adaptado & Agilidade
    {
        id: 'fdf0361a-b2f6-48ef-8be3-b35f51be3b6f',
        name: 'Polichinelo Adaptado',
        description: 'Variação de baixo impacto do polichinelo, dando passos laterais alternados em vez de saltar.',
        category: 'Cardio',
        difficulty: 'Iniciante',
        body_parts: ['Corpo Todo'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'd25f2891-9c91-4b06-b5d5-a965ca657350',
        name: 'Marcha Estacionária Alta',
        description: 'Marchar no lugar elevando bem os joelhos, mantendo o abdômen contraído. Cardio leve e equilíbrio.',
        category: 'Cardio',
        difficulty: 'Iniciante',
        body_parts: ['Pernas', 'Core'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'a1545d00-8aed-4ba7-812a-83470b38edc8',
        name: 'Boxe de Sombra (Shadow Boxing)',
        description: 'Simular socos (jab, direto) no ar, mantendo base ativa. Pode ser feito em pé ou sentado.',
        category: 'Cardio',
        difficulty: 'Iniciante',
        body_parts: ['Braços', 'Ombros', 'Core'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '75f5f09d-3010-4615-9a15-73f41f0c05a5',
        name: 'Agachamento com Soco',
        description: 'Realizar um agachamento e, ao subir, desferir um soco cruzado. Coordenação e força.',
        category: 'Funcional',
        difficulty: 'Intermediário',
        body_parts: ['Pernas', 'Braços', 'Core'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'ef9809ab-8ed8-4054-a7a8-126aa530a9dc',
        name: 'Deslocamento Lateral (Shuffle)',
        description: 'Mover-se lateralmente com passos rápidos e curtos, mantendo joelhos semiflexionados.',
        category: 'Agilidade',
        difficulty: 'Intermediário',
        body_parts: ['Pernas', 'Quadril'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '45803b1d-30ca-400e-ad2f-df7e266729ce',
        name: 'Coordenação Cruzada (Cross Crawl)',
        description: 'Tocar o cotovelo no joelho oposto, alternando os lados. Ótimo para coordenação motora e aquecimento.',
        category: 'Coordenação',
        difficulty: 'Iniciante',
        body_parts: ['Core', 'Cérebro'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '8ff5fa14-835c-4a25-b82c-d642782be9f4',
        name: 'Escalada na Parede (Wall Climber)',
        description: 'Apoiado na parede (inclinado), levar alternadamente os joelhos em direção ao peito.',
        category: 'Cardio',
        difficulty: 'Iniciante',
        body_parts: ['Core', 'Pernas'],
        equipment: ['Parede'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '44df23a0-a4be-4cc3-8e6f-e5aaaefb5d82',
        name: 'Pular Corda Imaginária',
        description: 'Simular o movimento de pular corda com pequenos saltos ou apenas elevando os calcanhares.',
        category: 'Cardio',
        difficulty: 'Iniciante',
        body_parts: ['Panturrilha', 'Pernas'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'ff68b19a-3e01-41fe-aa5a-88b1451f6c7d',
        name: 'Step Touch com Braços',
        description: 'Passo lateral tocando a ponta do pé, abrindo e fechando os braços sincronizadamente.',
        category: 'Coordenação',
        difficulty: 'Iniciante',
        body_parts: ['Corpo Todo'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'ce4cad36-c3d9-42f6-8a55-82513a6567f1',
        name: 'Heel Flicks (Calcanhar no Glúteo)',
        description: 'Marchar ou trotar no lugar levando os calcanhares em direção aos glúteos.',
        category: 'Cardio',
        difficulty: 'Iniciante',
        body_parts: ['Posterior da Coxa', 'Cardio'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

async function insertdata() {
    console.log('Inserting new exercises (Batch 22)...');
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
