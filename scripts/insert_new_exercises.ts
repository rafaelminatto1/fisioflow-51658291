
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
    // Batch 21 - Plyometrics & Advanced Core
    {
        id: '9fa43615-8b6e-49cc-ad58-577298bfa2dd',
        name: 'Depth Jump (Salto Profundo)',
        description: 'Cair de uma caixa e saltar verticalmente o mais alto possível imediatamente após o contato com o solo. Potência reativa.',
        category: 'Pliometria',
        difficulty: 'Avançado',
        body_parts: ['Pernas', 'Glúteos'],
        equipment: ['Box Pliométrico'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'd6042be1-f9e7-443c-aa79-39e64960f113',
        name: 'Salto Unilateral na Caixa',
        description: 'Saltar para cima de uma caixa utilizando apenas uma perna. Desenvolvimento de força e potência unilateral.',
        category: 'Pliometria',
        difficulty: 'Avançado',
        body_parts: ['Pernas', 'Glúteos'],
        equipment: ['Box Pliométrico'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '95dd2a2c-5fe2-40ed-b57d-ace308a859cf',
        name: 'Salto Horizontal (Broad Jump)',
        description: 'Salto em distância parado, focando em máxima extensão de quadril e aterrissagem controlada.',
        category: 'Pliometria',
        difficulty: 'Intermediário',
        body_parts: ['Pernas', 'Glúteos'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '3a914408-ff33-4924-a853-9a833151463c',
        name: 'Tuck Jump (Salto Grupard)',
        description: 'Saltar verticalmente puxando os joelhos em direção ao peito no ponto mais alto. Potência explosiva.',
        category: 'Pliometria',
        difficulty: 'Avançado',
        body_parts: ['Pernas', 'Core'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '1b2fed47-b1f8-4caa-9200-43664eb9deeb',
        name: 'Medicine Ball Slam',
        description: 'Arremessar a bola medicinal contra o chão com força total, utilizando o corpo todo. Potência e core.',
        category: 'Potência',
        difficulty: 'Intermediário',
        body_parts: ['Core', 'Ombros', 'Dorsal'],
        equipment: ['Medicine Ball'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'bf9fd47a-e046-4f63-9565-b1bc49f7db87',
        name: 'Elevação de Pernas na Barra',
        description: 'Pendurado na barra, elevar as pernas estendidas até a altura do quadril ou tocar a barra (Toes to Bar).',
        category: 'Fortalecimento',
        difficulty: 'Avançado',
        body_parts: ['Abdômen', 'Flexores de Quadril'],
        equipment: ['Barra Fixa'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '49b385fb-7f5f-444b-b749-58e2c5195bea',
        name: 'Ab Wheel Rollout',
        description: 'Ajoelhado, rolar a roda abdominal para frente estendendo o tronco e retornar controlado. Anti-extensão intensa.',
        category: 'Fortalecimento',
        difficulty: 'Avançado',
        body_parts: ['Core'],
        equipment: ['Roda Abdominal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'a4759e6b-2570-49cd-97a7-9b48a8b211bc',
        name: 'Hollow Rock (Canoa)',
        description: 'Posição de canoa (lombar no chão, braços e pernas estendidos fora do chão), balançando o corpo em bloco.',
        category: 'Isometria',
        difficulty: 'Avançado',
        body_parts: ['Core'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '7ddcb9f0-daf5-4921-b29f-7a81faca8014',
        name: 'V-Up (Abdominal Canivete)',
        description: 'Simultaneamente elevar tronco e pernas estendidas, tocando os pés no topo do movimento.',
        category: 'Fortalecimento',
        difficulty: 'Avançado',
        body_parts: ['Abdômen'],
        equipment: ['Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '85cb38c0-d365-41fe-893c-35093cb2d6f8',
        name: 'L-Sit (Sustentação em L)',
        description: 'Sustentar o peso do corpo nas mãos (chão ou paralelas) mantendo as pernas estendidas à frente em L.',
        category: 'Isometria',
        difficulty: 'Avançado',
        body_parts: ['Core', 'Tríceps', 'Flexores de Quadril'],
        equipment: ['Paralelas/Peso Corporal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

async function insertdata() {
    console.log('Inserting new exercises (Batch 21)...');
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
