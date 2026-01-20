
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

// Phase 21: Functional & Geriatric Exercises (text-only, images pending)
const newExercises = [
    {
        name: 'Apoio Unipodal Olhos Fechados',
        category: 'Equilíbrio',
        description: 'Ficar em pé sobre uma perna só com os olhos fechados. Desafio avançado para propriocepção e equilíbrio vestibular.'
    },
    {
        name: 'Clock Reach (Alcance do Relógio)',
        category: 'Equilíbrio',
        description: 'Apoiado em uma perna, tocar com a outra o chão em diferentes posições como os ponteiros de um relógio (12h, 3h, 6h, 9h).'
    },
    {
        name: 'Corner Stretch (Alongamento no Canto)',
        category: 'Mobilidade',
        description: 'Alongamento peitoral com os braços apoiados nas paredes em um canto, inclinando-se para a frente.'
    },
    {
        name: 'Rotação Torácica Sentado',
        category: 'Mobilidade',
        description: 'Sentado em uma cadeira, realizar rotação do tronco para olhar para trás, mantendo o quadril fixo.'
    },
    {
        name: 'Elevação de Calcanhar Sentado',
        category: 'Fortalecimento',
        description: 'Sentado em uma cadeira, elevar os calcanhares do chão para fortalecer o sóleo (panturrilha).'
    },
    {
        name: 'Farmer\'s Carry (Caminhada do Fazendeiro)',
        category: 'Funcional',
        description: 'Caminhar segurando pesos pesados em ambas as mãos ao lado do corpo. Excelente para estabilidade de core e preensão.'
    },
    {
        name: 'Wall Angels (Anjos na Parede)',
        category: 'Mobilidade',
        description: 'De costas para a parede, deslizar os braços para cima e para baixo como se desenhasse asas de anjo. Melhora postura e mobilidade de ombro.'
    },
    {
        name: 'Caminhada na Ponta dos Pés',
        category: 'Equilíbrio',
        description: 'Caminhar em linha reta na ponta dos pés para desafiar o equilíbrio e fortalecer a panturrilha.'
    },
    {
        name: 'Caminhada nos Calcanhares',
        category: 'Equilíbrio',
        description: 'Caminhar em linha reta apoiado nos calcanhares para fortalecer o tibial anterior e melhorar o equilíbrio.'
    },
    {
        name: 'Ponte com Uma Perna',
        category: 'Fortalecimento',
        description: 'Realizar a ponte glútea elevando uma perna estendida. Desafio avançado para glúteos e core.'
    }
];

async function insertExercises() {
    console.log('Inserting Phase 21 exercises (text-only, images pending)...');

    const { data: existing } = await supabase
        .from('exercises')
        .select('name');

    const existingNames = new Set(existing?.map(e => e.name.toLowerCase()));

    const toInsert = newExercises
        .filter(e => !existingNames.has(e.name.toLowerCase()))
        .map(e => ({
            name: e.name,
            category: e.category,
            description: e.description,
            video_url: '',
            image_url: '', // Placeholder - images pending
            thumbnail_url: ''
        }));

    if (toInsert.length > 0) {
        const { data, error } = await supabase.from('exercises').insert(toInsert).select();
        if (error) console.error('Error inserting:', error);
        else console.log(`Inserted ${data.length} new exercises`);
    } else {
        console.log('All exercises already exist.');
    }

    // Output summary
    const { count } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
    console.log(`\nTotal exercises in library: ${count}`);
}

insertExercises();
