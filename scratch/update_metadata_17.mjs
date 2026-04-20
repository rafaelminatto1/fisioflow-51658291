import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "e102660d-d421-4f1e-922e-33631587372b", progression: "Aumentar a carga do halter ou realizar com apoio unipodal no degrau.", sets: 3, reps: 15, rpe: 6 },
  { id: "9cc3f8a7-4e9b-4ad0-82c7-6e4c8e451002", progression: "Aumentar a carga do halter ou utilizar banda elástica para resistência variável.", sets: 3, reps: 12, rpe: 6 },
  { id: "1aad542e-26ee-4758-8a97-450e4db0d3fa", progression: "Adicionar caneleiras ou realizar com foco em contração excêntrica lenta.", sets: 3, reps: 15, rpe: 6 },
  { id: "d5ca93dc-44da-45eb-8de1-c139b2bee50d", progression: "Aumentar a velocidade de transição ou adicionar rotação torácica com alcance.", sets: 3, reps: 8, rpe: 6 },
  { id: "fc207ece-1acb-4fdc-849f-0b47eee02d03", progression: "Aumentar a altura do salto ou a velocidade de reatividade no solo.", sets: 3, reps: 6, rpe: 9 },
  { id: "3e8bd760-cec2-462c-9f10-39aa8c243aeb", progression: "Realizar com pé sobre superfície instável ou com carga no quadril.", sets: 3, reps: 12, rpe: 7 },
  { id: "52b768f7-3d62-4379-b756-18626a24f4d1", progression: "Fechar os olhos ou realizar movimentos de cabeça/braços (dual-task).", sets: 3, reps: 60, rpe: 6 },
  { id: "44026881-f395-43b1-8437-87a747671833", progression: "Aumentar a carga do halter ou utilizar hand grip para resistência extra.", sets: 3, reps: 15, rpe: 5 },
  { id: "e7f22737-a2f6-4f85-946f-b5d16339bc46", progression: "Aumentar a carga do halter ou realizar sem apoio das mãos (equilíbrio puro).", sets: 3, reps: 10, rpe: 7 },
  { id: "ca4e687d-07b7-4a5f-a92d-27a7c366da65", progression: "Realizar com carga no peito (Goblet) ou em base unipodal parcial.", sets: 3, reps: 12, rpe: 5 },
  { id: "9723383b-ccdc-4815-a219-8e42d0c87944", progression: "Progredir a amplitude de extensão de punho e inclinação lateral cervical.", sets: 3, reps: 12, rpe: 3 },
  { id: "725e7c07-fe79-46fb-99f4-b6fd1738ce82", progression: "Aumentar a altura do salto inicial ou focar em aterrissagem silenciosa.", sets: 3, reps: 8, rpe: 6 },
  { id: "fc7afc33-b2ed-4db9-a166-591247232c97", progression: "Realizar com retroversão pélvica ativa para aumentar o alongamento do reto femoral.", sets: 3, reps: 30, rpe: 4 },
  { id: "bf106c3d-7d51-413c-a7e7-c8d77c018949", progression: "Realizar mobilização assistida com banda elástica para tração articular.", sets: 3, reps: 12, rpe: 3 },
  { id: "d6ffdfe8-8442-4951-9904-51239f5765e9", progression: "Aumentar a tensão da banda elástica ou variar a angulação do fêmur.", sets: 3, reps: 12, rpe: 4 },
  { id: "aec87ffd-2db0-443d-a2bf-e61691915340", progression: "Agachamento com carga (barra ou halter) ou agachamento unilateral.", sets: 3, reps: 15, rpe: 6 },
  { id: "579602db-606f-4c82-812d-a623131f24ff", progression: "Aumentar o tempo de isometria ou realizar com uma perna elevada.", sets: 3, reps: 45, rpe: 7 },
  { id: "25814c99-f438-48f3-84ed-8cb49d2fbbc9", progression: "Focar na respiração diafragmática profunda durante o movimento.", sets: 2, reps: 12, rpe: 3 },
  { id: "f54c7e59-5005-4f97-8aa3-079e28df7389", progression: "Aumentar a amplitude gradualmente conforme a tolerância e ADM.", sets: 3, reps: 12, rpe: 3 }
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
    console.log("Batch update 17 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
