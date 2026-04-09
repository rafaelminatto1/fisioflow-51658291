import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const DB_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const CATEGORY_MAP = {
    "Joelho": "7fba5d96-dd36-401f-b5f9-ab59d708e1ad",
    "Ombro": "fbbe8da4-b66c-4cb1-ad22-c2087447e458",
    "Coluna": "e3648295-86e5-4043-a1e1-f98027ef14f6",
    "Quadril": "03d6c909-dcf1-4169-95a2-cdf758f7b4ff",
    "Tornozelo / Pé": "53eab68e-1255-45d3-846b-f9bcfefcef45",
    "Neurologia": "8bdf8734-e8fc-4e4c-9978-793a0f2c45d6",
    "Respiratório": "159e0e75-fac8-450d-9527-d6360158b14e",
    "Core / Estabilização": "c4a6c77a-6159-4d39-ad2b-256c1793f36f",
    "Funcional / AVDs": "4fc4e9f0-6e88-4084-9b7b-922e0e91b2ba",
    "Retorno ao Esporte": "15fd4b20-e2b6-4028-929c-4870bb94daae",
    "fortalecimento": "44c277c4-8272-48b1-bf8f-aae2960f903f",
    "alongamento": "e85d719c-f5d4-434e-baa7-64000d6f86b5",
    "mobilidade": "be227fb7-ee05-4264-ad69-98beb7929409"
};

const REVERSE_MAP = {
    "Core": "Core / Estabilização",
    "Joelho / Quadril": "Joelho",
    "Posterior / Quadril": "fortalecimento",
    "Posterior da Coxa": "fortalecimento",
    "Quadril / Glúteo": "Quadril",
    "Tornozelo / Perna": "Tornozelo / Pé",
    "Tornozelo": "Tornozelo / Pé",
    "Propriocepção": "Retorno ao Esporte",
    "Pliometria / RTS": "Retorno ao Esporte",
    "Escápula": "Ombro",
    "Ombro / Escápula": "Ombro",
    "Cotovelo / Braço": "fortalecimento",
    "Antebraço": "fortalecimento",
    "Mão": "fortalecimento",
    "Coluna Torácica": "Coluna",
    "Cervical": "Coluna",
    "Pliometria / Corrida": "Retorno ao Esporte",
    "Pliometria": "Retorno ao Esporte",
    "Alongamento": "alongamento",
    "Liberação": "alongamento",
    "Mobilidade": "mobilidade",
    "Respiratório": "Respiratório",
    "Core": "Core / Estabilização",
    "Funcional": "Funcional / AVDs"
};

async function fixMetadata() {
    console.log("Starting bulk metadata fix...");
    const content = readFileSync('src/data/exerciseDictionary.ts', 'utf8');
    
    // ex("id", "pt", "en", ["aliases"], ["aliases"], "subcategory", "description_pt", "description_en")
    const regex = /ex\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*\[(.*?)\],\s*\[(.*?)\],\s*"([^"]+)"/g;
    
    let match;
    let count = 0;
    
    while ((match = regex.exec(content)) !== null) {
        const [_, id, pt, en, aliasesPtRaw, aliasesEnRaw, subcategory] = match;
        
        let mappedCatName = REVERSE_MAP[subcategory] || subcategory;
        let categoryId = CATEGORY_MAP[mappedCatName];
        
        // Tags padrão baseada na subcategoria e nome
        const tags = [subcategory.toLowerCase().split(' / ')[0], pt.toLowerCase().split(' ')[0]];
        if (pt.toLowerCase().includes('faixa')) tags.push('elastico');
        if (pt.toLowerCase().includes('bola')) tags.push('bola');
        if (pt.toLowerCase().includes('halter')) tags.push('halter');

        const tagsStr = `ARRAY[${tags.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]`;

        if (categoryId) {
            const sql = `
                UPDATE exercises 
                SET 
                    category_id = '${categoryId}',
                    subcategory = '${subcategory.replace(/'/g, "''")}',
                    tags = array_cat(tags, ${tagsStr})
                WHERE 
                    (name ILIKE '%${pt.replace(/'/g, "''")}%')
                    OR (dictionary_id = '${id}');
            `;
            
            try {
                execSync(`psql "${DB_URL}" -c "${sql.replace(/\n/g, ' ')}"`);
                count++;
            } catch (err) {
                console.error(`Error updating exercise ${pt}:`, err.message);
            }
        }
    }
    
    // Limpeza de tags duplicadas
    console.log("Cleaning up duplicate tags...");
    execSync(`psql "${DB_URL}" -c "UPDATE exercises SET tags = (SELECT ARRAY(SELECT DISTINCT unnest(tags))) WHERE tags IS NOT NULL;"`);

    console.log(`Metadata fix complete. Processed ${count} records.`);
}

fixMetadata().catch(console.error);
