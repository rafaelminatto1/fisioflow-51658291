import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
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
  {
    id: "17c53541-8d77-40a7-96b3-24b3b47e41ce",
    progression: "Realizar mobilização com auxílio de bastão ou banda elástica.",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "1e2c3be0-288d-4858-ab94-345adf190ebd",
    progression: "Aumentar a velocidade de transição ou adicionar rotação torácica com alcance.",
    sets: 3,
    reps: 8,
    rpe: 6,
  },
  {
    id: "50d2fbe0-c7be-466b-a3bb-0c5e8c777feb",
    progression: "Ponte unilateral ou com calcanhares sobre superfície instável.",
    sets: 3,
    reps: 15,
    rpe: 5,
  },
  {
    id: "33fc05eb-d127-463f-95e4-ff1ce430f80e",
    progression: "Aumentar a velocidade ou realizar Skipping alto.",
    sets: 3,
    reps: 30,
    rpe: 6,
  },
  {
    id: "15068005-3448-4b29-aa5e-7a596d7929df",
    progression: "Aumentar a distância lateral ou a velocidade de reatividade.",
    sets: 3,
    reps: 10,
    rpe: 8,
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
    console.log("Batch update 13 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
