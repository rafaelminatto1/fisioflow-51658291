import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

const fiftyExercises = [
  "Alongamento de Isquiotibiais Sentado",
  "Alongamento de Quadríceps em Pé",
  "Alongamento de Panturrilha na Parede",
  "Alongamento de Glúteo (Figura 4) Deitado",
  "Alongamento de Glúteo (Figura 4) Sentado",
  "Alongamento de Piriforme",
  "Alongamento de Adutores (Borboleta)",
  "Alongamento de Adutores Lateral",
  "Alongamento de Gato-Camelo (Cat-Cow)",
  "Alongamento de Extensão Lombar (Cobra)",
  "Alongamento de Flexão Lombar (Posição da Criança)",
  "Alongamento Torácico (Child Pose com Rotação)",
  "Alongamento de Peitoral na Porta",
  "Alongamento de Peitoral no Canto da Parede",
  "Alongamento de Bíceps na Parede",
  "Alongamento de Tríceps Overhead",
  "Alongamento de Antebraço (Flexores)",
  "Alongamento de Antebraço (Extensores)",
  "Alongamento de Pescoço (Trapézio Superior)",
  "Alongamento de Levantador da Escápula",
  "Alongamento de Rombóides (Abraço a si mesmo)",
  "Alongamento de Ílio-psoas (Afundo profundo)",
  "Alongamento de Quadrado Lombar Sentado",
  "Alongamento de Iliotibial Cruzado em Pé",
  "Alongamento de Fáscia Plantar",
  "Mobilidade de Tornozelo (Knee to Wall)",
  "Mobilidade de Tornozelo com Band Elástico",
  "Mobilidade de Quadril (90/90 Básico)",
  "Mobilidade de Quadril (Rotação Interna Alternada)",
  "Mobilidade Torácica (Open Book)",
  "Mobilidade Torácica (Quatro Apoios Rotação)",
  "Mobilidade de Ombro (Wall Angels)",
  "Mobilidade de Ombro (Bastão Passagem Frontal/Traseira)",
  "Mobilidade Cervical (Rotação Ativa)",
  "Mobilidade Cervical (Retração Ativa)",
  "Mobilidade Lombar (Pelvic Tilts no Chão)",
  "Mobilidade de Punho (Círculos Ativos)",
  "Mobilidade de Punho (Quatro Apoios Rocking)",
  "Caminhada do Urso (Bear Crawl - Mobilidade Global)",
  "Agachamento Profundo Sustentado (Asian Squat)",
  "Cossack Squat (Mobilidade Adutores)",
  "Rotação de Quadril em Prancha (Spiderman Lunge)",
  "Thread the Needle (Mobilidade Torácica Alta)",
  "Mobilidade de Escápula (Scapular Push-ups)",
  "Mobilidade de Escápula (Scapular Pull-ups)",
  "Mobilidade de Ombro (Deslizamento na Parede Lateral)",
  "Mobilidade de Quadril (Ponte com Alcance Cruzado)",
  "Extensão de Quadril Ativa no Chão",
  "Flexão Ativa de Quadril em Pé (Over Hurdle)",
  "Abdução de Quadril Ativa em Pé (Swing Lateral)",
];

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, "") // remove símbolos
    .trim()
    .replace(/\s+/g, "-");
}

async function run() {
  console.log("Iniciando inserção dos 50 novos exercícios...");
  let count = 0;

  for (const name of fiftyExercises) {
    const slug = generateSlug(name);
    // Verificar se já existe antes
    const existing = await sql`SELECT id FROM exercises WHERE slug = ${slug} LIMIT 1`;
    if (existing.length === 0) {
      await sql`
        INSERT INTO exercises (name, slug)
        VALUES (${name}, ${slug})
      `;
      count++;
    } else {
      console.log(`[SKIPPED] ${name} já existe.`);
    }
  }

  console.log(`✅ ${count} Novos exercícios (sem preenchimento) inseridos com sucesso!`);
}

run()
  .catch(console.error)
  .finally(() => process.exit(0));
