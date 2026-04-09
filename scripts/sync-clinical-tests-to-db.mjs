import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const DB_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function sync() {
    console.log("Starting Clinical Tests sync from physioDictionary...");
    const content = readFileSync('src/data/physioDictionary.ts', 'utf8');
    
    // Extrahir os itens da categoria 'test'
    // { id: '...', pt: '...', en: '...', aliases_pt: [...], aliases_en: [...], category: 'test', ... }
    const regex = /\{\s*id:\s*'([^']+)',\s*pt:\s*'([^']+)',\s*en:\s*'([^']+)',\s*aliases_pt:\s*\[(.*?)\],\s*aliases_en:\s*\[(.*?)\],\s*category:\s*'test'/g;
    
    let match;
    let count = 0;
    
    while ((match = regex.exec(content)) !== null) {
        const [_, id, pt, en, aliasesPtRaw, aliasesEnRaw] = match;
        
        const aliasesPt = aliasesPtRaw.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
        const aliasesEn = aliasesEnRaw.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
        
        if (en) aliasesEn.push(en);

        const aliasesPtStr = aliasesPt.length > 0 ? `ARRAY[${aliasesPt.map(a => `'${a.replace(/'/g, "''")}'`).join(',')}]` : "'{}'";
        const aliasesEnStr = aliasesEn.length > 0 ? `ARRAY[${aliasesEn.map(a => `'${a.replace(/'/g, "''")}'`).join(',')}]` : "'{}'";

        const sql = `
            UPDATE clinical_test_templates 
            SET 
                aliases_pt = array_cat(aliases_pt, ${aliasesPtStr}),
                aliases_en = array_cat(aliases_en, ${aliasesEnStr}),
                dictionary_id = '${id}'
            WHERE 
                (name ILIKE '%${pt.replace(/'/g, "''")}%') 
                OR ('${pt.replace(/'/g, "''")}' ILIKE '%' || name || '%')
                OR (dictionary_id = '${id}');
        `;
        
        try {
            execSync(`psql "${DB_URL}" -c "${sql.replace(/\n/g, ' ')}"`);
            count++;
        } catch (err) {
            console.error(`Error updating clinical test ${pt}:`, err.message);
        }
    }
    
    console.log("Cleaning up duplicate aliases for clinical tests...");
    execSync(`psql "${DB_URL}" -c "UPDATE clinical_test_templates SET aliases_pt = (SELECT ARRAY(SELECT DISTINCT unnest(aliases_pt))), aliases_en = (SELECT ARRAY(SELECT DISTINCT unnest(aliases_en))) WHERE aliases_pt IS NOT NULL OR aliases_en IS NOT NULL;"`);

    console.log(`Sync complete. Processed ${count} clinical test entries.`);
}

sync().catch(console.error);
