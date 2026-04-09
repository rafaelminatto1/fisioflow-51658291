import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const DB_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function merge() {
    console.log("Starting bulk exercise fusion...");
    
    // Lista de nomes para fundir (identificados na pesquisa)
    const duplicateNames = [
        'Prancha abdominal',
        'Alongamento de quadríceps',
        'Agachamento livre',
        'Fortalecimento de glúteo',
        'Abdução de quadril em pé',
        'Dead bug',
        'Mobilidade de ombro',
        'Mobilidade de coluna',
        'Elevação de panturrilha em pé',
        'Abdominal oblíquo',
        'Abdominal crupeado',
        '4 apoios (four point kneeling)',
        'Extensão de joelho em cadeia cinética aberta',
        'Levantamento terra',
        'Abdução de quadril deitado',
        'Respiração diafragmática',
        'Alongamento de peitoral na porta'
    ];

    for (const name of duplicateNames) {
        console.log(`Processing set: ${name}...`);
        
        // 1. Buscar todos os registros com esse nome
        const sqlGet = `SELECT id, image_url, tags, body_parts, equipment, category_id, subcategory, difficulty FROM exercises WHERE name ILIKE '${name.replace(/'/g, "''")}';`;
        const result = execSync(`psql "${DB_URL}" -t -c "${sqlGet}"`).toString();
        
        const lines = result.trim().split('\n').filter(Boolean);
        if (lines.length <= 1) {
            console.log(`  No duplicates found for ${name}. Skipping.`);
            continue;
        }

        const items = lines.map(line => {
            const parts = line.split('|').map(p => p.trim());
            return {
                id: parts[0],
                image_url: parts[1],
                tags: parsePgArray(parts[2]),
                body_parts: parsePgArray(parts[3]),
                equipment: parsePgArray(parts[4]),
                category_id: parts[5],
                subcategory: parts[6],
                difficulty: parts[7]
            };
        });

        // 2. Determinar o Canônico (Preferência para AVIF)
        let canonical = items.find(it => it.image_url?.includes('.avif')) || items[0];
        const toMerge = items.filter(it => it.id !== canonical.id);

        console.log(`  Canonical: ${canonical.id} (${canonical.image_url})`);
        console.log(`  Merging ${toMerge.length} items.`);

        // 3. Consolidar Metadados
        const allTags = new Set([...canonical.tags, ...toMerge.flatMap(it => it.tags)]);
        const allBodyParts = new Set([...canonical.body_parts, ...toMerge.flatMap(it => it.body_parts)]);
        const allEquipment = new Set([...canonical.equipment, ...toMerge.flatMap(it => it.equipment)]);
        
        // Limpeza de tags vazias
        const cleanTags = Array.from(allTags).filter(t => t && t.trim().length > 0);
        const cleanBodyParts = Array.from(allBodyParts).filter(t => t && t.trim().length > 0);
        const cleanEquipment = Array.from(allEquipment).filter(t => t && t.trim().length > 0);

        // 4. Update Canonical
        const updateSql = `
            UPDATE exercises 
            SET 
                tags = ${toPgArray(cleanTags)},
                body_parts = ${toPgArray(cleanBodyParts)},
                equipment = ${toPgArray(cleanEquipment)},
                aliases_pt = array_cat(aliases_pt, ARRAY['${name.replace(/'/g, "''")}'])
            WHERE id = '${canonical.id}';
        `;
        execSync(`psql "${DB_URL}" -c "${updateSql}"`);

        // 5. Delete Obsoletos (Smart Merge)
        for (const item of toMerge) {
            execSync(`psql "${DB_URL}" -c "DELETE FROM exercises WHERE id = '${item.id}';"`);
        }
        
        console.log(`  Set ${name} merged successfully.`);
    }

    console.log("Bulk fusion complete.");
}

function parsePgArray(pgArr) {
    if (!pgArr || pgArr === '{}' || pgArr === 'NULL') return [];
    return pgArr.replace(/[\{\}]/g, '').split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean);
}

function toPgArray(arr) {
    if (!arr || arr.length === 0) return "'{}'";
    return `ARRAY[${arr.map(a => `'${a.replace(/'/g, "''")}'`).join(',')}]`;
}

merge().catch(console.error);
