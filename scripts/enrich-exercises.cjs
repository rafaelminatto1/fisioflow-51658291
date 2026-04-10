const { Client } = require('pg');

const DB_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

const CATEGORIES = {
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
    "Fortalecimento": "44c277c4-8272-48b1-bf8f-aae2960f903f",
    "Alongamento": "e85d719c-f5d4-434e-baa7-64000d6f86b5",
    "Mobilidade": "be227fb7-ee05-4264-ad69-98beb7929409"
};

const ENRICHMENT_RULES = [
    {
        keywords: ["Alongamento", "Flexibilidade", "Stretch"],
        category: "Alongamento",
        tags: ["flexibilidade", "wellness"]
    },
    {
        keywords: ["Mobilização", "Mobilidade", "Circulos", "Giro"],
        category: "Mobilidade",
        tags: ["amplitude", "articular"]
    },
    {
        keywords: ["Fortalecimento", "Peso", "Carga", "Dumbbell", "Halter"],
        category: "Fortalecimento",
        tags: ["forca", "hipertrofia"]
    },
    {
        keywords: ["Joelho", "Quadrisceps", "Isquios", "Leg", "Agachamento", "Patela", "Step Up"],
        category: "Joelho",
        muscles: ["Quadriceps", "Hamstrings"]
    },
    {
        keywords: ["Ombro", "Shoulder", "Manguito", "Escápula", "Scapular", "Peitoral", "Tríceps", "Bíceps"],
        category: "Ombro",
        muscles: ["Deltoids", "Rotator Cuff", "Biceps", "Triceps"]
    },
    {
        keywords: ["Quadril", "Glúteo", "Hip", "Pelvica", "Abdução", "Clamshell"],
        category: "Quadril",
        muscles: ["Gluteus Maximus", "Gluteus Medius", "Iliopsoas"]
    },
    {
        keywords: ["Tornozelo", "Ponta", "Panturrilha", "Pé", "Ankle", "Plantar", "Calcanhar"],
        category: "Tornozelo / Pé",
        muscles: ["Gastrocnemius", "Soleus", "Tibialis Anterior"]
    },
    {
        keywords: ["Coluna", "Spine", "Cervical", "Lombar", "Torácica", "Back", "Cat-Camel", "Bird Dog"],
        category: "Coluna",
        muscles: ["Erector Spinae", "Multifidus"]
    },
    {
        keywords: ["Core", "Abdominal", "Plancha", "Prancha", "Estabilização", "Dead Bug"],
        category: "Core / Estabilização",
        muscles: ["Rectus Abdominis", "Obliques", "Transversus Abdominis"]
    },
    {
        keywords: ["Respiratório", "Inspiratório", "Expiratório", "Respiração"],
        category: "Respiratório",
        muscles: ["Diaphragm", "Intercostals"]
    }
];

async function runEnrichment() {
    console.log("🚀 Iniciando enriquecimento clínico (CommonJS Environment)...");

    const client = new Client({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query('SELECT id, name, category_id, muscles_primary FROM exercises');
        const exercises = res.rows;
        let updatedCount = 0;

        for (const ex of exercises) {
            const updates = {};
            const nameLower = ex.name.toLowerCase();

            for (const rule of ENRICHMENT_RULES) {
                if (rule.keywords.some(kw => nameLower.includes(kw.toLowerCase()))) {
                    if (rule.category && (!ex.category_id)) {
                        updates.category_id = CATEGORIES[rule.category];
                    }
                    if (rule.muscles && (!ex.muscles_primary || ex.muscles_primary.length === 0)) {
                        updates.muscles_primary = rule.muscles;
                    }
                }
            }

            if (Object.keys(updates).length > 0) {
                const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
                const values = Object.values(updates);
                values.push(ex.id);
                
                await client.query(
                    `UPDATE exercises SET ${fields}, updated_at = NOW() WHERE id = $${values.length}`,
                    values
                );
                updatedCount++;
            }
        }

        console.log(`✅ Sucesso: ${updatedCount} exercícios enriquecidos com dados clínicos.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Falha no enriquecimento:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runEnrichment();
