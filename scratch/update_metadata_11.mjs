import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "e067c293-80b1-419b-af5a-ef5f6f6916a4", progression: "Aumentar a inclinação do tronco ou realizar movimentos circulares mais amplos.", sets: 3, reps: 60, rpe: 2 },
  { id: "8ceed7b2-ac72-43d5-8d29-47c81e234897", progression: "Aumento progressivo de carga com barra ou variação unilateral.", sets: 4, reps: 10, rpe: 8 },
  { id: "fa8a49b7-cfcd-4a77-84ec-ec345ecd08c5", progression: "Reduzir a altura da cadeira ou progredir para agachamento livre.", sets: 3, reps: 12, rpe: 5 },
  { id: "80a81042-412a-4a28-a7b2-641e92501e1a", progression: "Aumento da resistência da banda ou posicionamento da banda nos tornozelos/pés.", sets: 3, reps: 20, rpe: 7 },
  { id: "c06aef41-c29f-44d3-b06b-21c24ebdcd71", progression: "Adicionar caneleiras ou realizar em 4 apoios com perna estendida.", sets: 3, reps: 15, rpe: 6 },
  { id: "bf41a9b5-fc3f-4110-8b71-0ef5d9aa4b6d", progression: "Realizar sobre superfície instável (espuma/disco) mantendo os olhos fechados.", sets: 3, reps: 30, rpe: 8 },
  { id: "7fb207a7-8139-49e6-a718-2b8ad591c305", progression: "Aumentar a altura do salto ou a velocidade de transição entre as pernas.", sets: 3, reps: 10, rpe: 9 },
  { id: "60911b03-c204-4f03-b33d-ddc5d4c23238", progression: "Progressão de carga ou variação unipodal em degrau.", sets: 3, reps: 20, rpe: 6 },
  { id: "c506feb8-88e3-49aa-b467-df018ba96402", progression: "Aumento de carga sobre os joelhos ou foco na fase excêntrica controlada.", sets: 3, reps: 15, rpe: 7 },
  { id: "a69f1946-6f77-4840-a737-6eb4089e3c60", progression: "Realizar o relaxamento de forma guiada ou com música relaxante.", sets: 1, reps: 1, rpe: 2 },
  { id: "deafbb28-b240-4e10-8d9a-26e76609f627", progression: "Caminhar com as mãos para os lados para alongar musculatura lateral.", sets: 2, reps: 45, rpe: 2 },
  { id: "5637ceb1-b46e-4d29-9bc9-d8a3afbe4ff6", progression: "Aumento de carga com barra ou variação em déficit (pés elevados).", sets: 4, reps: 8, rpe: 9 }
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
    console.log("Batch update 11 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
