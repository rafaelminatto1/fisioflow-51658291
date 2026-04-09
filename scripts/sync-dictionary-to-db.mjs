import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const DB_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function sync() {
    console.log("Starting dictionary sync...");
    const content = readFileSync('src/data/exerciseDictionary.ts', 'utf8');
    
    // Simplistic regex to extract ex(...) calls
    // ex("id", "pt", "en", ["alias1", "alias2"], ["alias_en1"], "subcategory", "desc_pt", "desc_en")
    const regex = /ex\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*\[(.*?)\]\s*,\s*\[(.*?)\]/g;
    
    let match;
    let count = 0;
    
    while ((match = regex.exec(content)) !== null) {
        const [_, id, pt, en, aliasesPtRaw, aliasesEnRaw] = match;
        
        const aliasesPt = aliasesPtRaw.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
        const aliasesEn = aliasesEnRaw.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
        
        // Adicionamos o nome em inglês aos apelidos de busca se não for nulo
        if (en) aliasesEn.push(en);

        const aliasesPtStr = aliasesPt.length > 0 ? `ARRAY[${aliasesPt.map(a => `'${a.replace(/'/g, "''")}'`).join(',')}]` : "'{}'";
        const aliasesEnStr = aliasesEn.length > 0 ? `ARRAY[${aliasesEn.map(a => `'${a.replace(/'/g, "''")}'`).join(',')}]` : "'{}'";

        // SQL para atualizar por nome - tentativa de match mais flexível
        const sql = `
            UPDATE exercises 
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
            if (count % 10 === 0) console.log(`Processed ${count} exercises...`);
        } catch (err) {
            console.error(`Error updating ${pt}:`, err.message);
        }
    }
    
    // Cleanup: remove duplicate entries in aliases arrays
    console.log("Cleaning up duplicate aliases...");
    execSync(`psql "${DB_URL}" -c "UPDATE exercises SET aliases_pt = (SELECT ARRAY(SELECT DISTINCT unnest(aliases_pt))), aliases_en = (SELECT ARRAY(SELECT DISTINCT unnest(aliases_en))) WHERE aliases_pt IS NOT NULL OR aliases_en IS NOT NULL;"`);

    console.log(`Sync complete. Processed ${count} dictionary entries.`);
}

sync().catch(console.error);
