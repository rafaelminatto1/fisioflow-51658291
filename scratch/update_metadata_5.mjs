import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "89fe1888-aa91-4dbb-9372-64b702e67aa0", progression: "Aumentar a carga no cabo/elástico ou realizar em base ajoelhada (half-kneeling).", sets: 3, reps: 12, rpe: 6 },
  { id: "5cc49679-830d-44a3-b67d-8f4ae3ba8223", progression: "Aumentar o diâmetro dos círculos ou a velocidade de rotação no Fitball.", sets: 3, reps: 10, rpe: 8 },
  { id: "7e21f14a-72e3-4535-9ef9-10392d908432", progression: "Realizar em apoio unipodal ou sobre superfície instável (disco de equilíbrio).", sets: 3, reps: 10, rpe: 4 },
  { id: "8a8e9799-b2b1-46b4-ac30-f82d149430c1", progression: "Realizar com pernas elevadas ou com carga no peito.", sets: 3, reps: 15, rpe: 6 },
  { id: "094f51a9-305c-4d01-a71b-20d05565ba6a", progression: "Pernas estendidas (alavanca longa) ou com caneleiras.", sets: 3, reps: 12, rpe: 7 },
  { id: "052d06cc-dc9e-4fa9-be83-cc71bb069c7f", progression: "Aumentar a velocidade mantendo o controle ou realizar com maior amplitude.", sets: 3, reps: 20, rpe: 7 },
  { id: "ca9a5c32-3e82-4e8a-9a21-371e484d80eb", progression: "Aumentar a flexão de tronco ou realizar movimentos de braço alternados.", sets: 3, reps: 30, rpe: 3 },
  { id: "b523af33-89ff-4e35-a47c-b7b1a7c67540", progression: "Puxar a toalha com mais força ou progredir para alongamento manual.", sets: 3, reps: 30, rpe: 4 },
  { id: "e2e66789-4743-42e6-b232-7e61c13855ba", progression: "Adicionar carga (medicinal ball) ou elevar os pés do solo.", sets: 3, reps: 20, rpe: 7 },
  { id: "68efc336-a02f-4fb8-9f05-00afb97207c3", progression: "Aumentar o tempo de isometria ou realizar movimentos de natação com braços.", sets: 3, reps: 12, rpe: 6 },
  { id: "d25771b9-a824-4455-b848-1e02f3dc7dc9", progression: "Aumentar a amplitude ou adicionar carga leve nas costas.", sets: 3, reps: 15, rpe: 5 },
  { id: "ec04640e-bf1f-4148-881d-7b60e201b3bf", progression: "Caminhar com as mãos para os lados para alongar musculatura lateral.", sets: 2, reps: 45, rpe: 2 },
  { id: "cd549922-3b5a-4d53-b912-37393d8d490f", progression: "Progressão para extensão mantida com braços estendidos ou em pé.", sets: 3, reps: 10, rpe: 4 },
  { id: "0d47fc21-637f-484d-bea6-9e8fe7ba4a5e", progression: "Realizar contra resistência manual leve ou com banda elástica cervical.", sets: 3, reps: 12, rpe: 3 },
  { id: "29285d0d-4430-4b24-931c-720d8b691f23", progression: "Progressão para movimentos de ponte ou abdominal crupeado.", sets: 3, reps: 10, rpe: 4 },
  { id: "f9fac326-631d-4e1f-bbad-6927e550dd42", progression: "Aumentar a amplitude da rotação ou realizar com os braços estendidos.", sets: 3, reps: 10, rpe: 4 },
  { id: "74123e1f-5ab0-4338-b40c-32abc180309d", progression: "Progressão de carga gradual ou realização com apoio em banco baixo.", sets: 3, reps: 12, rpe: 7 },
  { id: "b3605c52-b458-4263-9056-1779ba2843f3", progression: "Retirar joelhos do solo ou adicionar carga externa.", sets: 3, reps: 12, rpe: 8 },
  { id: "0c4077f8-179f-43b1-b4ff-05d8a14803f0", progression: "Reduzir a inclinação ou progredir para flexão no solo.", sets: 3, reps: 15, rpe: 5 },
  { id: "50919edd-6639-44e1-851a-115a56758a96", progression: "Aumentar o peso leve na mão ou o diâmetro dos círculos.", sets: 3, reps: 60, rpe: 2 },
  { id: "e0df87ae-4ef3-4df0-b944-c15f0c987e91", progression: "Aumento de carga ou foco em pausa na máxima retração.", sets: 3, reps: 12, rpe: 7 },
  { id: "a7a80b05-0723-4c52-97c2-4e6689371143", progression: "Aumento de carga ou realização de rotação com elástico lateral.", sets: 3, reps: 10, rpe: 8 },
  { id: "ae328acc-7236-4e0f-bf6a-bb0271ede792", progression: "Aumento de carga com barra ou variação em déficit (pés elevados).", sets: 4, reps: 8, rpe: 9 },
  { id: "bdc8c1fb-d613-490f-9838-2dd29594aaca", progression: "Aumento de carga ou foco em fluidez de movimento sem pausas.", sets: 3, reps: 5, rpe: 9 },
  { id: "37b7cd5b-ccf9-41d4-8cfa-156dac518db0", progression: "Aumento de carga ou realização em terreno irregular/escada.", sets: 3, reps: 20, rpe: 8 },
  { id: "53273709-b9bd-49b5-8495-8f6cdce44f12", progression: "Aumentar a inclinação lateral ou realizar com o braço nas costas.", sets: 3, reps: 30, rpe: 4 },
  { id: "328f722b-9b0a-4cec-a75d-5d9deb1738de", progression: "Elevar o apoio para o joelho ou aumentar o tempo de isometria.", sets: 3, reps: 20, rpe: 8 },
  { id: "5b42e888-789f-43e5-8145-5d41b325acc6", progression: "Aumentar a altura da caixa ou realizar saltos seguidos (reativo).", sets: 3, reps: 8, rpe: 8 },
  { id: "4dcbff90-1a5f-4a9b-a235-359d9d0886f2", progression: "Aumentar a altura do salto ou a velocidade de execução.", sets: 3, reps: 10, rpe: 8 },
  { id: "3f57c569-7c3d-4203-a0b0-9252839c50da", progression: "Aumentar a distância do salto ou realizar saltos com carga (leve).", sets: 3, reps: 8, rpe: 9 }
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
    console.log("Batch update 5 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
