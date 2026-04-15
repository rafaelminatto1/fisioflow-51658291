const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";
const TARGET_DIR = path.join(process.cwd(), 'public/exercises/illustrations');

async function sync() {
    const sql = neon(DATABASE_URL);
    try {
        console.log('🚀 Iniciando sincronização universal de imagens...');
        
        if (!fs.existsSync(TARGET_DIR)) {
            console.error(`❌ Diretório não encontrado: ${TARGET_DIR}`);
            return;
        }

        const files = fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.avif'));
        console.log(`📂 Encontrados ${files.length} arquivos AVIF.`);

        let updatedCount = 0;
        let skippedCount = 0;
        let notFoundCount = 0;

        for (const file of files) {
            const slug = path.parse(file).name;
            const imageUrl = `/exercises/illustrations/${file}`;

            // Check if exercise exists and update
            const res = await sql`
                UPDATE exercises 
                SET image_url = ${imageUrl}, thumbnail_url = ${imageUrl}
                WHERE slug = ${slug}
                RETURNING name
            `;

            if (res.length > 0) {
                console.log(`✅ Sincronizado: ${res[0].name} -> ${imageUrl}`);
                updatedCount++;
            } else {
                // If not found by slug, maybe search by name? (safest to stick to slug)
                console.warn(`⚠️ Slug não encontrado no DB: ${slug}`);
                notFoundCount++;
            }
        }

        console.log('\n--- Resumo da Sincronização ---');
        console.log(`✅ Atualizados: ${updatedCount}`);
        console.log(`⚠️ Não encontrados no DB: ${notFoundCount}`);
        console.log(`✨ Sincronização concluída!`);

    } catch (err) {
        console.error('❌ Erro durante a sincronização:', err);
    }
}

sync();
