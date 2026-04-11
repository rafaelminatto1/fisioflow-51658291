const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const mappings = [
  { name: "Pular Corda Imaginária", category: "Funcional / AVDs" },
  { name: "Torção de Toalha (Grip)", category: "Funcional / AVDs" },
  { name: "Marcha Estacionária Alta", category: "Funcional / AVDs" },
  { name: "Extensão de Cotovelo com Garrafa", category: "fortalecimento" },
  { name: "Polichinelo Adaptado", category: "Funcional / AVDs" },
  { name: "Oposição de Dedos", category: "Funcional / AVDs" },
  { name: "Quadríceps Arco Curto", category: "Joelho" },
  { name: "Extensão de Cotovelo (Tricep)", category: "fortalecimento" },
  { name: "Escalada na Parede (Wall Climber)", category: "Ombro" },
  { name: "Step Down", category: "Joelho" },
  { name: "Pronação e Supinação de Punho", category: "Funcional / AVDs" },
  { name: "Marcha com Padrões Cruzados", category: "Neurologia" }
];

async function finalizeCategorization() {
  console.log("Finalizando categorização manual...");
  
  const categories = await sql`SELECT id, name FROM exercise_categories`;
  const categoryMap = {};
  categories.forEach(c => {
    categoryMap[c.name] = c.id;
  });

  for (const m of mappings) {
    const categoryId = categoryMap[m.category];
    if (categoryId) {
      const result = await sql`
        UPDATE exercises 
        SET category_id = ${categoryId} 
        WHERE name = ${m.name} AND category_id IS NULL
      `;
      console.log(`- Atualizado: ${m.name} -> ${m.category}`);
    } else {
      console.warn(`- Categoria não encontrada: ${m.category} para ${m.name}`);
    }
  }
  
  console.log("Categorização manual concluída.");
}

finalizeCategorization().catch(console.error);
