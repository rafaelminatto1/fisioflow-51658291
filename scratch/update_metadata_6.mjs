import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  {
    id: "05cc9ea0-8087-492a-8750-ecabf4d1373f",
    progression: "Adicionar carga (dumbbells) ou realizar com movimentos de braço alternados.",
    sets: 3,
    reps: 10,
    rpe: 7,
  },
  {
    id: "569e59b9-2e1b-4a20-94be-9de06c131217",
    progression: "Aumentar a distância lateral ou realizar saltos seguidos (skating jumps).",
    sets: 3,
    reps: 10,
    rpe: 8,
  },
  {
    id: "bd0eb7cb-7c6e-4978-8586-1a2872cf40aa",
    progression: "Realizar movimentos de braço mais rápidos ou com olhos fechados.",
    sets: 3,
    reps: 30,
    rpe: 5,
  },
  {
    id: "81f95733-aa81-4bde-8c4a-25adc832dcbb",
    progression: "Aumento de carga progressivo com barra ou variação unilateral (B-stance).",
    sets: 4,
    reps: 10,
    rpe: 8,
  },
  {
    id: "55116247-ab76-40f8-a3ba-195d5bbd77e7",
    progression: "Realizar sentado com inclinação de tronco ou em pé com pé elevado.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "7ac7964d-bfea-4ea0-8419-425577b880e1",
    progression: "Realizar em decúbito lateral ou em pé com foco em retroversão pélvica.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "bdbf8be7-c330-4afe-99e3-e10c9a9a810d",
    progression: "Realizar em posição de afundo profundo ou com elevação do pé posterior.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "6c6b60cb-347b-4317-8e49-449f9cea9d2b",
    progression: "Realizar em diferentes alturas de braço (Y, T, W) para variar o foco.",
    sets: 3,
    reps: 30,
    rpe: 3,
  },
  {
    id: "cd0ea681-c92c-4006-bdd7-5afc3c868bab",
    progression: "Adicionar mini-band nos punhos ou realizar em base unipodal.",
    sets: 3,
    reps: 12,
    rpe: 4,
  },
  {
    id: "32ec0a99-c6c3-4f21-98d2-9aee0d31c27f",
    progression: "Aumentar a rotação do tronco ou realizar em decúbito dorsal (posição de 4).",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "b2baee7b-8594-4298-8056-20946cdf57ba",
    progression: "Aumentar tempo de isometria ou adicionar carga leve nas mãos.",
    sets: 3,
    reps: 10,
    rpe: 5,
  },
  {
    id: "8ec340fb-073f-4ddb-9a34-bbc3ce276b65",
    progression: "Realizar em posição de cócoras lateral ou com abertura progressiva.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "722d9c76-6769-4b1e-ad1f-57cb0070448b",
    progression: "Realizar com joelho estendido em degrau para maior amplitude.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "7a79f8b3-2931-4618-a7ce-1063702a8aa8",
    progression: "Realizar com joelho levemente flexionado para isolar o sóleo.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "bc69e40a-c984-4635-9489-45412917f13e",
    progression: "Progredir para Nível 2 (dinâmico) ou aumentar tempo de isometria.",
    sets: 3,
    reps: 20,
    rpe: 6,
  },
  {
    id: "c5da19e8-e549-4bdd-8e82-5a87b7759c4f",
    progression: "Aumentar a velocidade de descida ou realizar com olhos fechados.",
    sets: 3,
    reps: 10,
    rpe: 5,
  },
  {
    id: "42347676-72ce-401d-b294-952ba9661e10",
    progression: "Realizar na moldura da porta ou com braço em diferentes ângulos.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "e589794c-6474-4982-bdb5-29724af5bbf2",
    progression: "Progredir para exercícios unilaterais ou com carga elástica/peso.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "e5e34355-4939-4a74-b71f-3fe22186ad01",
    progression: "Realizar inclinação lateral pura ou com leve rotação cervical.",
    sets: 3,
    reps: 30,
    rpe: 3,
  },
  {
    id: "f3904f78-b5fe-4cbd-b46a-54f4efab8afa",
    progression: "Realizar em pé pendurado em barra ou em posição de prece.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "c11adcd2-8580-420f-a64a-160ee94aa32c",
    progression: "Aumentar a adução horizontal do braço ou realizar em decúbito lateral.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "5c389719-5452-478a-bde0-a8266adcce42",
    progression: "Cruzamento de pernas em pé com inclinação lateral do tronco.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "ada6ddca-1f81-4ef2-adb6-d40b33c8f167",
    progression: "Aumentar a pressão do corpo sobre o rolo ou focar em pontos doloridos.",
    sets: 2,
    reps: 60,
    rpe: 5,
  },
  {
    id: "0223355b-41cb-4082-9a5f-3d99b6c34b29",
    progression: "Variação unilateral ou aumento de carga externa.",
    sets: 3,
    reps: 15,
    rpe: 7,
  },
  {
    id: "b045cf5a-e256-4f4b-9026-716da4edd7aa",
    progression: "Focar em pontos de gatilho por mais tempo ou realizar movimentos lentos.",
    sets: 2,
    reps: 60,
    rpe: 6,
  },
  {
    id: "287da632-87be-4820-bf47-f7ef96bc9f1c",
    progression: "Realizar mobilização com banda elástica (distração articular).",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "08983634-dacc-41ab-b85d-604f5ad53c49",
    progression: "Variações em 4 apoios (Frog stretch) ou com rotação interna/externa.",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "5d1ccf64-73d9-46e1-a95b-c535dc634b1d",
    progression: "Aumento de carga ou foco em fase excêntrica controlada.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "bd653123-bca8-4eaa-a42a-1bc8de623100",
    progression: "Realizar sobre o foam roller ou com bastão (rotações).",
    sets: 3,
    reps: 12,
    rpe: 4,
  },
];

async function update() {
  try {
    for (const item of updates) {
      await sql.query(
        `
        UPDATE exercises 
        SET progression_suggestion = $1, 
            suggested_sets = $2, 
            suggested_reps = $3, 
            suggested_rpe = $4 
        WHERE id = $5
      `,
        [item.progression, item.sets, item.reps, item.rpe, item.id],
      );
      console.log(`Updated: ${item.id}`);
    }
    console.log("Batch update 6 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
