const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const client = new Client({ 
    connectionString: DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

const missingExercises = [
    { name: 'Alongamento de Romboides Sentado', slug: 'alongamento-romboides-sentado', category_id: 'e85d719c-f5d4-434e-baa7-64000d6f86b5', muscles_primary: ['rombóides', 'trapézio'], difficulty: 'iniciante' },
    { name: 'Alongamento Subescapular', slug: 'alongamento-subescapular', category_id: 'e85d719c-f5d4-434e-baa7-64000d6f86b5', muscles_primary: ['subescapular'], difficulty: 'iniciante' },
    { name: 'Alongamento de Tensor da Fáscia Lata', slug: 'alongamento-tensor-fascia-lata', category_id: 'e85d719c-f5d4-434e-baa7-64000d6f86b5', muscles_primary: ['tensor da fáscia lata'], difficulty: 'iniciante' },
    { name: 'Alongamento de Tríceps na Parede', slug: 'alongamento-triceps-parede', category_id: 'e85d719c-f5d4-434e-baa7-64000d6f86b5', muscles_primary: ['tríceps'], difficulty: 'iniciante' },
    { name: 'Alongamento de Tríceps Sentado', slug: 'alongamento-triceps-sentado', category_id: 'e85d719c-f5d4-434e-baa7-64000d6f86b5', muscles_primary: ['tríceps'], difficulty: 'iniciante' },
    { name: 'Alongamento de Tríceps com Toalha', slug: 'alongamento-triceps-toalha', category_id: 'e85d719c-f5d4-434e-baa7-64000d6f86b5', muscles_primary: ['tríceps'], difficulty: 'iniciante' },
    { name: 'Isometria de Inversão de Tornozelo', slug: 'ankle-inversion-isometric', category_id: '44c277c4-8272-48b1-bf8f-aae2960f903f', muscles_primary: ['tibial posterior'], difficulty: 'iniciante' },
    { name: 'Avanço com Halteres', slug: 'avanco-com-halteres', category_id: '44c277c4-8272-48b1-bf8f-aae2960f903f', muscles_primary: ['quadríceps', 'glúteos'], difficulty: 'intermediario' },
    { name: 'Avanço com Salto', slug: 'avanco-com-salto', category_id: '44c277c4-8272-48b1-bf8f-aae2960f903f', muscles_primary: ['quadríceps', 'glúteos'], difficulty: 'avancado' },
    { name: 'Avanço Isométrico', slug: 'avanco-isometrico', category_id: '44c277c4-8272-48b1-bf8f-aae2960f903f', muscles_primary: ['quadríceps', 'glúteos'], difficulty: 'intermediario' },
    { name: 'Avanço Reverso com Halteres', slug: 'avanco-reverso-halteres', category_id: '44c277c4-8272-48b1-bf8f-aae2960f903f', muscles_primary: ['quadríceps', 'glúteos'], difficulty: 'intermediario' },
    { name: 'Barra Fixa Pronada', slug: 'barra-fixa-pronada', category_id: '44c277c4-8272-48b1-bf8f-aae2960f903f', muscles_primary: ['latíssimo do dorso', 'bíceps'], difficulty: 'avancado' },
    { name: 'Barra Fixa Supinada', slug: 'barra-fixa-supinada', category_id: '44c277c4-8272-48b1-bf8f-aae2960f903f', muscles_primary: ['latíssimo do dorso', 'bíceps'], difficulty: 'avancado' },
    { name: 'Rosca Bíceps Alternada', slug: 'bicep-curl-alternado', category_id: '44c277c4-8272-48b1-bf8f-aae2960f903f', muscles_primary: ['bíceps'], difficulty: 'iniciante' },
    { name: 'Rosca Martelo', slug: 'bicep-curl-martelo', category_id: '44c277c4-8272-48b1-bf8f-aae2960f903f', muscles_primary: ['braquiorradial', 'bíceps'], difficulty: 'iniciante' }
];

async function run() {
    try {
        await client.connect();
        console.log('🚀 Creating 15 missing exercises for Batch 4...');

        for (const ex of missingExercises) {
            // Check if exists
            const check = await client.query('SELECT id FROM exercises WHERE slug = $1', [ex.slug]);
            if (check.rows.length > 0) {
                console.log(`⏩ Skipping: ${ex.slug} already exists.`);
                continue;
            }

            const query = `
                INSERT INTO exercises (name, slug, category_id, muscles_primary, muscles_secondary, difficulty, equipment, instructions, description, is_active, is_public)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true)
                RETURNING id;
            `;
            const values = [
                ex.name,
                ex.slug,
                ex.category_id,
                ex.muscles_primary,
                [], // muscles_secondary
                ex.difficulty,
                [], // equipment (empty array)
                'Instrução pendente.', // placeholder instructions (string)
                'Exercício em fase de importação.' // placeholder description
            ];

            const res = await client.query(query, values);
            console.log(`✅ Created: ${ex.slug} (ID: ${res.rows[0].id})`);
        }

        console.log('✨ All missing exercises processed.');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

run();
