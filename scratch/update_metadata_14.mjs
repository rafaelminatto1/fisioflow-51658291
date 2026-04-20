import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "c15042de-aa4f-4cde-9cf9-28cdb6c8169e", progression: "Aumentar a inclinação inicial ou adicionar resistência de banda.", sets: 3, reps: 8, rpe: 9 },
  { id: "868bd11e-5352-4eca-882d-bf1faf4cee0c", progression: "Realizar com pernas e braços estendidos ou segurando carga leve.", sets: 3, reps: 12, rpe: 8 },
  { id: "016e0c1f-4498-4c0a-b418-876109548cf2", progression: "Aumentar a carga ou caminhar sobre superfícies irregulares.", sets: 3, reps: 60, rpe: 7 },
  { id: "a644a383-289e-4fb9-9a1b-3f1513b29872", progression: "Realizar com maior amplitude assistida ou foco em níveis vertebrais específicos.", sets: 2, reps: 10, rpe: 3 },
  { id: "be22afd1-de31-400b-a3d0-2a59a14fcdab", progression: "Aumentar a tensão da banda ou carga do halter, focar em isometria final.", sets: 3, reps: 12, rpe: 6 },
  { id: "13194255-4faa-480f-a13c-6081fdd2a831", progression: "Aumentar a velocidade ou adicionar movimentos de braço mais amplos.", sets: 3, reps: 60, rpe: 4 },
  { id: "9da8f08b-1db1-49fd-980f-8f8c2a923989", progression: "Aumentar a resistência da banda ou focar na contração escapular isométrica.", sets: 3, reps: 12, rpe: 6 },
  { id: "ddb808f5-5ab5-49ca-bfe4-31f7e641582e", progression: "Aumentar o tempo de retenção ou realizar em posição de meditação.", sets: 1, reps: 10, rpe: 1 },
  { id: "d45ebafe-e55e-442f-a745-28fa9f149b5b", progression: "Realizar em W com banda elástica ou focar em depressão escapular associada.", sets: 3, reps: 15, rpe: 4 },
  { id: "aaa6c339-97e4-4f04-a2c0-047e8c00e5fe", progression: "Reduzir o suporte gradualmente até o agachamento livre.", sets: 3, reps: 15, rpe: 4 },
  { id: "e7f16c0f-7597-42b1-acfd-cce87575fd23", progression: "Aumentar a velocidade ou carregar pesos extras (unilateral ou bilateral).", sets: 3, reps: 20, rpe: 5 },
  { id: "e33feda9-054e-4da4-9dda-1e464b59292c", progression: "Aumentar a carga dos halteres ou focar no controle de descida.", sets: 3, reps: 12, rpe: 5 },
  { id: "11572ad9-14a7-4f47-84ee-20fda0d11843", progression: "Focar na dissociação de movimento entre lombar e torácica.", sets: 2, reps: 12, rpe: 3 },
  { id: "6b3ea758-f4cd-4c6a-bb1b-7f9732d3510d", progression: "Utilizar bandas elásticas mais fortes para resistência dos dedos.", sets: 3, reps: 15, rpe: 5 },
  { id: "8dd30660-1907-42ec-9a5b-1548e4437839", progression: "Reduzir o apoio das mãos ou realizar com obstáculos baixos.", sets: 3, reps: 120, rpe: 5 },
  { id: "8c85d73b-8c32-416d-9d81-6d0f3ec00ccd", progression: "Prancha dinâmica com toques nos ombros ou elevação de pernas.", sets: 3, reps: 45, rpe: 7 },
  { id: "3e4379aa-1bbe-470d-a902-6b318fac80ea", progression: "Aumentar a amplitude lateral e velocidade dos braços.", sets: 3, reps: 60, rpe: 4 },
  { id: "50729cb6-5ec7-4d82-830d-13f567589a8a", progression: "Carga unilateral (Suitcase Walk) para maior desafio de estabilidade lateral.", sets: 3, reps: 60, rpe: 7 },
  { id: "f4a309c4-ce4c-4be9-bc48-b2cb34aacb04", progression: "Aumentar a altura do degrau ou segurar pesos nas mãos.", sets: 3, reps: 10, rpe: 6 },
  { id: "c35453b6-4ff1-4294-98e0-f53fd09d921d", progression: "Realizar em pé com foco em manter a coluna neutra e joelho estendido.", sets: 3, reps: 30, rpe: 4 }
];

async function update() {
  try {
    for (const item of updates) {
      await sql.query(`
        UPDATE exercises 
        SET progression_suggestion = $1, 
            suggested_sets = $2, 
            suggested_reps = $3, 
            suggested_rpe = $4 
        WHERE id = $5
      `, [item.progression, item.sets, item.reps, item.rpe, item.id]);
      console.log(`Updated: ${item.id}`);
    }
    console.log("Batch update 14 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
