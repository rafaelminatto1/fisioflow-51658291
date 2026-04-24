import { neon } from '@neondatabase/serverless';
import { exerciseDictionary } from '../src/data/exerciseDictionary';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

async function sync() {
    const sql = neon(DATABASE_URL);
    console.log('🚀 Iniciando sincronização do Dicionário para a Tabela de Exercícios...');

    let updatedCount = 0;
    let totalProcessed = 0;

    for (const exercise of exerciseDictionary) {
        totalProcessed++;
        
        // Map intensity to difficulty enum
        let difficulty = 'iniciante';
        if (exercise.intensity_level >= 5) difficulty = 'avancado';
        else if (exercise.intensity_level >= 3) difficulty = 'intermediario';

        const description = exercise.description_pt;
        const instructions = exercise.instruction_pt;
        const imageUrl = exercise.image_url;

        // UPSERT with full metadata
        const slug = exercise.id.replace('exd-', '');
        const res = await sql`
            INSERT INTO exercises (
                slug, name, image_url, thumbnail_url, description, instructions, difficulty, 
                pathologies_indicated, pathologies_contraindicated, "references",
                sets_recommended, reps_recommended, duration_seconds, updated_at
            ) VALUES (
                ${slug}, 
                ${exercise.pt}, 
                ${imageUrl}, 
                ${imageUrl}, 
                ${description}, 
                ${instructions}, 
                ${difficulty}::exercise_difficulty,
                ${exercise.indicated_pathologies || []},
                ${exercise.contraindicated_pathologies || []},
                ${JSON.stringify(exercise.scientific_references || [])},
                ${exercise.suggested_sets || 3},
                ${exercise.suggested_reps || 12},
                ${exercise.suggested_duration_seconds || null},
                NOW()
            )
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                image_url = EXCLUDED.image_url,
                thumbnail_url = EXCLUDED.thumbnail_url,
                description = EXCLUDED.description,
                instructions = EXCLUDED.instructions,
                difficulty = EXCLUDED.difficulty,
                pathologies_indicated = EXCLUDED.pathologies_indicated,
                pathologies_contraindicated = EXCLUDED.pathologies_contraindicated,
                "references" = EXCLUDED."references",
                sets_recommended = EXCLUDED.sets_recommended,
                reps_recommended = EXCLUDED.reps_recommended,
                duration_seconds = EXCLUDED.duration_seconds,
                updated_at = NOW()
            RETURNING name, slug
        `;

        if (res.length > 0) {
            console.log(`✅ Sincronizado: "${exercise.pt}" (Slug: ${slug})`);
            updatedCount++;
        }
    }

    console.log('\n--- Resumo Final ---');
    console.log(`📊 Processados: ${totalProcessed}`);
    console.log(`✅ Atualizados no DB: ${updatedCount}`);
    console.log(`✨ Sincronização concluída!`);
}

sync().catch(console.error);
