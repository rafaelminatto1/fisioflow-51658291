import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "06bec5ab-ee79-4b3c-969f-d57a85883701", progression: "Aumento de carga ou realização em diferentes ângulos de inclinação do antebraço.", sets: 3, reps: 15, rpe: 6 },
  { id: "67f02cc4-9f33-404a-8ce3-c0a023468519", progression: "Aumentar a resistência do elástico ou realizar caminhada nos calcanhares.", sets: 3, reps: 20, rpe: 5 },
  { id: "dbfc7f35-f427-497a-9cdb-0270c6285ada", progression: "Aumento de carga ou progredir para avanço com salto.", sets: 3, reps: 12, rpe: 8 },
  { id: "f451ae26-c34c-458d-8b0c-a992a11b343e", progression: "Aumentar o tempo de permanência ou realizar com olhos fechados.", sets: 3, reps: 30, rpe: 7 },
  { id: "98ad64ea-aa71-440e-afc6-9367adced7bc", progression: "Aumentar a tensão da banda ou realizar em pé com foco em controle do arco.", sets: 3, reps: 15, rpe: 6 },
  { id: "919af380-93e6-4844-a7c6-fcde3821b319", progression: "Aumentar a tensão da banda ou realizar movimentos rápidos de controle excêntrico.", sets: 3, reps: 15, rpe: 6 },
  { id: "ccb7432a-6bb0-403d-8db5-fa1cb03f00ff", progression: "Pé sobre bola suíça ou com halter no quadril.", sets: 3, reps: 12, rpe: 7 },
  { id: "dae5c538-3ef4-407d-8f14-2ac955c4649d", progression: "Realizar agachamentos sobre o BOSU ou lançamentos de bola medicinal.", sets: 3, reps: 45, rpe: 6 },
  { id: "4f5af516-a13e-4853-b438-119e81c80d38", progression: "Apoio unipodal mantendo o equilíbrio ou realizar movimentos de alcance (Star Excursion).", sets: 3, reps: 45, rpe: 6 },
  { id: "62d289e6-ac71-497f-bbb0-ce3267478bb5", progression: "Aumentar a distância do salto ou realizar saltos em zigue-zague.", sets: 3, reps: 10, rpe: 8 },
  { id: "b3604eb2-fe5f-4f50-a0a3-ee258b8b24c1", progression: "Aumento de carga ou realização com pausa no topo do movimento (2s).", sets: 3, reps: 12, rpe: 7 },
  { id: "50c862b1-a3e5-4303-8278-16d638011b1c", progression: "Realizar com carga externa (cinto de peso) ou focar na fase excêntrica lenta.", sets: 3, reps: 8, rpe: 9 },
  { id: "7dab5ffc-02c9-4580-8b4f-bc23c0ceda32", progression: "Aumento de carga ou realização alternada para maior controle de tronco.", sets: 3, reps: 12, rpe: 7 },
  { id: "bf19773b-8726-40da-b7e7-84fcfc0d2ae8", progression: "Realizar em decúbito lateral ou com elástico em diferentes graus de abdução.", sets: 3, reps: 15, rpe: 6 },
  { id: "bf4208a8-e581-42a2-8ada-8c58cf610e70", progression: "Realizar contra resistência (elástico de dedos) ou aumentar a velocidade mantendo precisão.", sets: 2, reps: 20, rpe: 4 },
  { id: "8b8d9f96-5f3a-4866-9649-ce1cdbb659fa", progression: "Aumento da resistência do elástico ou variação com foco em controle escapular.", sets: 3, reps: 15, rpe: 6 },
  { id: "4c7546fb-ea04-4271-9187-1076144b16a5", progression: "Aumento de carga leve ou realização em diagonal (plano da escápula).", sets: 3, reps: 15, rpe: 5 },
  { id: "1f358e52-25ae-4252-9123-e588953630d6", progression: "Realizar no banco inclinado ou com elástico (Face Pull).", sets: 3, reps: 15, rpe: 7 },
  { id: "b29e7660-c7f2-411c-8312-61bea3cc3c48", progression: "Adicionar carga leve (0.5kg) para tração articular suave ou aumentar diâmetro do pêndulo.", sets: 3, reps: 60, rpe: 2 },
  { id: "746bd71f-9b4a-4eb6-ade3-5d081c0d9e98", progression: "Inclinar o tronco para frente para intensificar o alongamento entre as escápulas.", sets: 3, reps: 30, rpe: 4 }
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
    console.log("Batch update 3 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
