import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "453deaf7-0275-47f9-9767-044202d2fc26", progression: "Aumentar a carga do halter ou realizar em base unipodal para desafio de equilíbrio.", sets: 3, reps: 12, rpe: 6 },
  { id: "a785ad97-7daa-4d93-a6b6-e541fb9536a9", progression: "Adicionar mini-band nos punhos ou realizar com foco em isometria no topo.", sets: 3, reps: 12, rpe: 4 },
  { id: "90f1271a-b3ac-4505-a77d-3e802b453656", progression: "Realizar com carga externa (halter leve) ou contra resistência de banda.", sets: 3, reps: 15, rpe: 4 },
  { id: "90d9a757-babb-444d-80a5-55039e77880d", progression: "Realizar em W com banda elástica ou focar em depressão escapular associada.", sets: 3, reps: 15, rpe: 4 },
  { id: "d260d97a-6e31-4b00-9abb-a71b2b4dcbaa", progression: "Aumentar a carga gradualmente ou focar em contração excêntrica lenta.", sets: 3, reps: 12, rpe: 6 },
  { id: "69e13938-c3ff-4e2f-8d8a-0b08ded75c17", progression: "Aumentar a carga ou utilizar banda elástica para resistência variável.", sets: 3, reps: 12, rpe: 6 },
  { id: "d84445a3-dee4-4f81-814e-f976fb6a6e6e", progression: "Aumentar a carga do halter ou utilizar hand grip.", sets: 3, reps: 15, rpe: 5 },
  { id: "900cfdf2-0b91-434a-9663-a81649f6d3fb", progression: "Aumentar a carga do halter ou focar em contração excêntrica lenta.", sets: 3, reps: 15, rpe: 5 },
  { id: "5ce76038-76ef-43d6-8455-60290a618ff0", progression: "Cruzar a perna mais profundamente ou realizar sentado inclinado.", sets: 3, reps: 30, rpe: 4 },
  { id: "47e0e589-4d0c-4fef-ba8d-854176a3c35e", progression: "Utilizar bastão ou carga leve (halter) para aumentar a resistência.", sets: 3, reps: 15, rpe: 4 },
  { id: "6b005f9c-97d2-415f-aa8d-6607faed7ff5", progression: "Aumentar a resistência da banda ou focar na isometria final.", sets: 3, reps: 15, rpe: 5 },
  { id: "7526c048-545e-488b-8f4d-0e23ddd9a4f2", progression: "Aumentar o tempo de sustentação ou adicionar movimentos leves de braços.", sets: 3, reps: 30, rpe: 8 },
  { id: "dc0b3486-acda-43ed-83b0-3c5bee243db3", progression: "Utilizar barras flexíveis de diferentes resistências.", sets: 3, reps: 15, rpe: 6 },
  { id: "1dfabd61-7880-4492-9c9f-c0afad93f221", progression: "Prancha dinâmica com toques nos ombros ou elevação de pernas.", sets: 3, reps: 45, rpe: 7 },
  { id: "9aa24b0b-e159-4d34-b447-15264aa58c32", progression: "Prancha lateral dinâmica (subir e descer quadril) ou com braço elevado.", sets: 3, reps: 45, rpe: 7 },
  { id: "abfebb68-22e8-4eb9-b1f9-90c0fd8862e8", progression: "Aumentar a carga do halter ou focar no controle de descida.", sets: 3, reps: 12, rpe: 6 },
  { id: "48ba9b50-ff7b-4c49-988d-4906150a4251", progression: "Aumentar a velocidade ou realizar com movimentos mais amplos mantendo a lombar neutra.", sets: 3, reps: 12, rpe: 6 },
  { id: "fc65fe36-79d2-4af3-8185-751e335b920d", progression: "Aumentar a carga ou caminhar sobre superfícies irregulares.", sets: 3, reps: 60, rpe: 7 },
  { id: "6e3082dd-12fe-4f59-90c4-99cc16c9baf2", progression: "Realizar com movimentos mais lentos ou adicionar pesos leves.", sets: 3, reps: 12, rpe: 6 },
  { id: "10680f49-f713-41bb-98b9-9ec93825116e", progression: "Aumentar a distância do rolamento ou o tempo de isometria terminal.", sets: 3, reps: 10, rpe: 9 }
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
    console.log("Batch update 20 (Final) completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
