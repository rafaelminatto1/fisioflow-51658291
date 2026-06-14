const { neon } = require("@neondatabase/serverless");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const mappings = [
  // Joellho
  { name: "Alongamento Isquiotibiais com Toalha", category: "Joelho" },
  { name: "Alongamento de Isquiotibiais", category: "Joelho" },
  { name: "Alongamento de Isquiotibiais em Pé", category: "Joelho" },
  { name: "Alongamento de Quadríceps", category: "Joelho" },
  { name: "Alongamento de Quadríceps com Toalha", category: "Joelho" },
  { name: "Alongamento de Quadríceps em Pé", category: "Joelho" },
  { name: "Nordic Hamstring (Iniciante)", category: "Joelho" },
  { name: "Nordic Hamstring Curl", category: "Joelho" },
  { name: "Passos Laterais com Faixa", category: "Joelho" },

  // Tornozelo / Pé
  { name: "Alongamento de Panturrilha Sentado (Sóleo)", category: "Tornozelo / Pé" },
  { name: "Alongamento de Panturrilha na Parede", category: "Tornozelo / Pé" },
  { name: "Alongamento de Sóleo na Parede", category: "Tornozelo / Pé" },
  { name: "Mobilidade do Hálux", category: "Tornozelo / Pé" },
  { name: "Mobilização de Tornozelo em DF", category: "Tornozelo / Pé" },

  // Quadril
  { name: "Alongamento 90-90", category: "Quadril" },
  { name: "Alongamento de Adutores", category: "Quadril" },
  { name: "Alongamento de Piriforme (4 Supino)", category: "Quadril" },
  { name: "Alongamento de Psoas (Ilíaco)", category: "Quadril" },
  { name: "Alongamento de Tensor da Fáscia Lata", category: "Quadril" },
  { name: "Scorpion Stretch", category: "Quadril" },
  { name: "Thomas Test Stretch", category: "Quadril" },
  { name: "Copenhagen Adduction (Nível 1)", category: "Quadril" },
  { name: "Elevação Pélvica (Ponte)", category: "Quadril" },
  { name: "RDL (Romanian Deadlift)", category: "Quadril" },
  { name: "Stiff Unilateral", category: "Quadril" },
  { name: "Mobilização de Quadril (Capsular)", category: "Quadril" },
  { name: "World's Greatest Stretch", category: "Quadril" },

  // Coluna
  { name: "Alongamento Lateral de Pescoço", category: "Coluna" },
  { name: "Alongamento de Romboides Sentado", category: "Coluna" },
  { name: "Alongamento de Rombóides na Parede", category: "Coluna" },
  { name: "Chin Tucks", category: "Coluna" },
  { name: "Cobra Prona", category: "Coluna" },
  { name: "Gato-Camelo", category: "Coluna" },
  { name: "Gato-Vaca (Cat-Cow)", category: "Coluna" },
  { name: "Rolling com Foam Roller", category: "Coluna" },

  // Ombro
  { name: "Alongamento Subescapular", category: "Ombro" },
  { name: "Alongamento de Peitoral na Porta", category: "Ombro" },
  { name: "Alongamento de Peitoral na Porta (Variação)", category: "Ombro" },
  { name: "Alongamento de Peitoral no Canto", category: "Ombro" },
  { name: "Corner Stretch (Alongamento no Canto)", category: "Ombro" },
  { name: "Barra Fixa Pronada", category: "Ombro" },
  { name: "Barra Fixa Supinada", category: "Ombro" },
  { name: "Face Pull", category: "Ombro" },
  { name: "Push-up Plus", category: "Ombro" },
  { name: "Rowing com Faixa Elástica", category: "Ombro" },
  { name: "Supino com halter", category: "Ombro" },
  { name: "Codman Pendular", category: "Ombro" },
  { name: "Mobilização de Ombro com Bastão", category: "Ombro" },
  { name: "Prone Y-T-W", category: "Ombro" },
  { name: "Wall Angels (Anjos na Parede)", category: "Ombro" },

  // Neurologia
  { name: "Deslizamento de Nervo Mediano", category: "Neurologia" },
  { name: "Deslizamento do Nervo Mediano", category: "Neurologia" },
  { name: "Mobilização de Nervo Ciático (Slump)", category: "Neurologia" },
  { name: "Mobilização de Nervo Mediano (Tinel e Phalen)", category: "Neurologia" },
  { name: "Mobilização de Nervo Ulnar", category: "Neurologia" },

  // Funcional / AVDs
  { name: "Alongamento de Tríceps Sentado", category: "Funcional / AVDs" },
  { name: "Alongamento de Tríceps com Toalha", category: "Funcional / AVDs" },
  { name: "Alongamento de Tríceps na Parede", category: "Funcional / AVDs" },
  { name: "Extensão de Cotovelo (Tricep)", category: "Funcional / AVDs" },
  { name: "Extensão de Cotovelo com Garrafa", category: "Funcional / AVDs" },
  { name: "Extensão de Dedos", category: "Funcional / AVDs" },
  { name: "Extensão de Punho com Halter", category: "Funcional / AVDs" },
  { name: "Flexão de Cotovelo (Bicep Curl)", category: "Funcional / AVDs" },
  { name: "Flexão de Punho com Halter", category: "Funcional / AVDs" },
  { name: "Fortalecimento de Preensão (Bolinha)", category: "Funcional / AVDs" },
  { name: "Pronação e Supinação com Peso", category: "Funcional / AVDs" },
  { name: "Rosca Bíceps Alternada", category: "Funcional / AVDs" },
  { name: "Rosca Martelo", category: "Funcional / AVDs" },
  { name: "Deslizamento de Tendões (Tendon Glides)", category: "Funcional / AVDs" },
  { name: "Desvio Radial", category: "Funcional / AVDs" },
  { name: "Desvio Radial de Punho", category: "Funcional / AVDs" },

  // Core / Estabilização
  { name: "Stretching Global Ativo", category: "Core / Estabilização" },
  { name: "Bird-Dog (Cachorro-Passarinho)", category: "Core / Estabilização" },
  { name: "Flexão de Braço (Push-up)", category: "Core / Estabilização" },
  { name: "Flexão de Braço na Parede", category: "Core / Estabilização" },
];

async function finalizeCategorization() {
  console.log(`Starting Phase 3 Categorization of ${mappings.length} exercises...`);

  const categories = await sql`SELECT id, name FROM exercise_categories`;
  const categoryMap = {};
  categories.forEach((c) => {
    categoryMap[c.name] = c.id;
  });

  let updatedCount = 0;
  for (const m of mappings) {
    const categoryId = categoryMap[m.category];
    if (categoryId) {
      const result = await sql`
        UPDATE exercises
        SET category_id = ${categoryId}, updated_at = NOW()
        WHERE name = ${m.name}
      `;
      if (result.length === 0) {
        // serverless neon result is different than pg client
        // In serverless, it might just return empty array if no rows affected or the updated rows.
      }
      updatedCount++;
      console.log(`- Updated: ${m.name} -> ${m.category}`);
    } else {
      console.warn(`- Category NOT found: ${m.category} for ${m.name}`);
    }
  }

  console.log(`Phase 3 completed. ${updatedCount} exercises re-categorized.`);
}

finalizeCategorization().catch(console.error);
