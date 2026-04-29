import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  {
    id: "7d1bebb9-bc12-496e-accf-deb5cd047e11",
    progression: "Aumentar a altura do degrau ou realizar saltos reativos horizontais.",
    sets: 3,
    reps: 6,
    rpe: 9,
  },
  {
    id: "58aa2fad-33df-40d5-a322-76aadb4629b1",
    progression: "Fechar os olhos ou realizar a caminhada sobre superfície de espuma.",
    sets: 3,
    reps: 30,
    rpe: 5,
  },
  {
    id: "876b6902-53ce-4843-918d-558a50c6ca9f",
    progression: "Aumentar a extensão assistida com as mãos (Press-up completo).",
    sets: 3,
    reps: 10,
    rpe: 3,
  },
  {
    id: "92c07ed7-e61c-43c4-8651-08a34ca3e1fe",
    progression: "Aumentar a altura dos obstáculos ou realizar com tarefas cognitivas simultâneas.",
    sets: 3,
    reps: 10,
    rpe: 6,
  },
  {
    id: "f9b5eb0c-34f0-47ae-a5a4-c0f723a86cea",
    progression: "Integrar com atividades de mobilização torácica leve.",
    sets: 1,
    reps: 10,
    rpe: 1,
  },
  {
    id: "26b81426-b061-4050-a7d2-a77eb62208c4",
    progression: "Realizar com pé sobre bola suíça ou adicionar carga no quadril.",
    sets: 3,
    reps: 12,
    rpe: 7,
  },
  {
    id: "e05cb78b-bcaa-41d0-a9e6-6fe6db307b51",
    progression:
      "Realizar com movimentos mais lentos ou adicionar pesos leves nos punhos/tornozelos.",
    sets: 3,
    reps: 12,
    rpe: 6,
  },
  {
    id: "ae2417ec-63d0-496c-a7d5-f801d561faca",
    progression: "Aumentar a carga gradualmente ou focar em contração excêntrica lenta.",
    sets: 3,
    reps: 15,
    rpe: 7,
  },
  {
    id: "00bd4bee-f76e-4787-b5c0-d2de83f91098",
    progression: "Aumentar a amplitude dos círculos conforme tolerância à dor.",
    sets: 3,
    reps: 60,
    rpe: 2,
  },
  {
    id: "158c531f-3285-4a29-913e-a486e1b48350",
    progression: "Aumentar o tempo de sustentação da elevação da cabeça.",
    sets: 3,
    reps: 10,
    rpe: 5,
  },
  {
    id: "70751514-d6d8-4ffc-9037-226b7433c590",
    progression: "Realizar em posição de 'sapinho' (Frog stretch) para maior amplitude.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "4d63978d-437d-4034-9996-d3a7499b9e35",
    progression: "Aumentar a carga ou o número de repetições mantendo a técnica.",
    sets: 3,
    reps: 15,
    rpe: 5,
  },
  {
    id: "f4934299-cf2b-4453-880a-6f3cfb9e398a",
    progression: "Progredir a amplitude de extensão de punho e inclinação cervical.",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "323149ca-b32d-4e3d-a144-4fe8a5cf3c18",
    progression: "Aumentar a carga do halter ou utilizar banda elástica para resistência extra.",
    sets: 3,
    reps: 12,
    rpe: 6,
  },
  {
    id: "44f17d93-fc49-4090-8d75-eaeb6e0b6b6d",
    progression: "Aumentar o volume inspirado ou o tempo de sustentação da inspiração.",
    sets: 3,
    reps: 10,
    rpe: 2,
  },
  {
    id: "88c5043c-6ddb-42a6-99b5-96cd3a3ec56b",
    progression: "Aumentar a carga da garrafa (usando areia em vez de água) ou halter.",
    sets: 3,
    reps: 15,
    rpe: 5,
  },
  {
    id: "9f6cddd0-664a-465e-adc7-e587571df522",
    progression: "Aumentar a tensão da banda ou realizar com foco em isometria final.",
    sets: 3,
    reps: 12,
    rpe: 6,
  },
  {
    id: "a846b647-74f5-41e5-a583-8147cbd61919",
    progression: "Realizar com foco em expansão costal profunda durante a inspiração.",
    sets: 3,
    reps: 10,
    rpe: 3,
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
    console.log("Batch update 19 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
