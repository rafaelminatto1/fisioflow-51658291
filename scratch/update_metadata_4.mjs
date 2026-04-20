import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "e067c293-80b1-419b-af5a-ef5f6f6916a4", progression: "Aumentar a inclinação do tronco ou realizar movimentos circulares mais amplos.", sets: 3, reps: 60, rpe: 2 },
  { id: "667634f3-238d-4e94-912a-637956382098", progression: "Aumentar a tensão da banda ou realizar rotação interna em diferentes alturas.", sets: 3, reps: 15, rpe: 6 },
  { id: "bc869156-590b-4176-be11-9a9973238626", progression: "Aumentar a resistência da banda ou realizar com pausa na contração máxima.", sets: 3, reps: 15, rpe: 6 },
  { id: "179427b3-c15c-444e-a740-420455437877", progression: "Aumentar a tensão da banda ou realizar com maior amplitude de movimento.", sets: 3, reps: 15, rpe: 6 },
  { id: "0b15e45c-e9c5-442a-a9e9-74e491be7c91", progression: "Aumentar a inclinação para frente ou realizar sentado para maior isolamento.", sets: 3, reps: 30, rpe: 4 },
  { id: "00b21703-e2ef-4573-82a8-a37a77b7899a", progression: "Inclinar a cabeça para o lado oposto ou realizar leve tração manual descendente.", sets: 3, reps: 30, rpe: 4 },
  { id: "6c919d36-82f5-44cb-bcbe-5309d57a2754", progression: "Aumento de carga gradual ou realização com barra (Remada Curvada).", sets: 3, reps: 12, rpe: 7 },
  { id: "898e3b7b-23ae-432d-9471-bc63283f510a", progression: "Aumentar a resistência da banda ou realizar remada unilateral (Serrote).", sets: 3, reps: 15, rpe: 6 },
  { id: "193245c1-39e1-4566-993d-d4924c53878b", progression: "Aumento de carga progressivo ou focar na fase de máxima contração.", sets: 3, reps: 12, rpe: 7 },
  { id: "6e90299d-128a-406c-974a-ef5232ce1da1", progression: "Progressão de carga ou realização alternada (Hammer Curl).", sets: 3, reps: 12, rpe: 6 },
  { id: "732f9191-23a4-4f0e-a9b0-bc3510c31671", progression: "Aumento de carga ou realizar com rotação de punho (Rosca Supinada).", sets: 3, reps: 12, rpe: 7 },
  { id: "1983bc74-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumento de carga externa ou realização com pegada neutra para maior conforto.", sets: 3, reps: 12, rpe: 7 },
  { id: "4c75123d-04e4-4f34-8e41-1a37635a141a", progression: "Realizar com o braço em diferentes ângulos de abdução para variar o alongamento.", sets: 3, reps: 30, rpe: 4 },
  { id: "98e312bc-128a-406c-974a-ef5232ce1da1", progression: "Aumento de carga ou realização em banco inclinado.", sets: 3, reps: 12, rpe: 7 },
  { id: "bc74a32c-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumento de carga ou focar na fase excêntrica lenta.", sets: 3, reps: 12, rpe: 8 },
  { id: "1923bc74-123a-4a2b-bc6e-d2406a00e8ea", progression: "Progressão para barra fixa com ajuda ou aumento de repetições.", sets: 3, reps: 8, rpe: 8 },
  { id: "bc741923-123a-4a2b-bc6e-d2406a00e8ea", progression: "Reduzir auxílio de elástico ou realizar barra livre.", sets: 3, reps: 8, rpe: 9 },
  { id: "1983bc74-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumento de carga ou realização com pausa no peito.", sets: 3, reps: 10, rpe: 8 },
  { id: "bc74a32c-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumento de carga ou progredir para flexão de braço no solo.", sets: 3, reps: 15, rpe: 5 },
  { id: "1923bc74-123a-4a2b-bc6e-d2406a00e8ea", progression: "Progredir para flexão com joelhos fora do solo ou com carga nas costas.", sets: 3, reps: 12, rpe: 7 },
  { id: "bc741923-123a-4a2b-bc6e-d2406a00e8ea", progression: "Progredir para flexão diamante ou com declinação (pés elevados).", sets: 3, reps: 10, rpe: 8 },
  { id: "bc74a32c-123a-4a2b-bc6e-d2406a00e8ea", progression: "Adicionar movimentos de membros superiores ou realizar sobre espuma.", sets: 3, reps: 30, rpe: 4 },
  { id: "1923bc74-123a-4a2b-bc6e-d2406a00e8ea", progression: "Realizar prancha com elevação de perna ou braço (alternado).", sets: 3, reps: 45, rpe: 6 },
  { id: "bc741923-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumentar tempo de isometria ou realizar prancha lateral dinâmica.", sets: 3, reps: 45, rpe: 7 },
  { id: "bc74a32c-123a-4a2b-bc6e-d2406a00e8ea", progression: "Progredir para V-up ou prancha abdominal.", sets: 3, reps: 15, rpe: 6 },
  { id: "1923bc74-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumentar a amplitude do movimento ou realizar com pernas estendidas.", sets: 3, reps: 15, rpe: 7 },
  { id: "bc741923-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumentar a velocidade das pernas mantendo a estabilidade do core.", sets: 3, reps: 30, rpe: 8 },
  { id: "bc74a32c-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumento de carga gradual ou realização unilateral.", sets: 3, reps: 12, rpe: 7 },
  { id: "1923bc74-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumento de carga ou progredir para agachamento livre.", sets: 3, reps: 12, rpe: 7 },
  { id: "bc741923-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumento progressivo de carga e amplitude.", sets: 3, reps: 12, rpe: 8 },
  { id: "bc74a32c-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumentar tempo sob tensão ou progredir para Stiff unilateral.", sets: 3, reps: 12, rpe: 7 },
  { id: "1923bc74-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumento de carga ou focar na máxima extensão do quadril.", sets: 3, reps: 12, rpe: 8 },
  { id: "bc741923-123a-4a2b-bc6e-d2406a00e8ea", progression: "Aumento de carga progressivo ou realização com pés elevados.", sets: 3, reps: 12, rpe: 8 },
  { id: "eee9e338-9f83-45b1-b27a-2280f370a73b", progression: "Aumentar a velocidade de preensão ou realizar com toalha molhada (mais pesada).", sets: 3, reps: 15, rpe: 4 },
  { id: "86cba33b-0b33-4f6e-842d-1d56f62ad519", progression: "Realizar contra leve resistência manual ou com mini-band.", sets: 3, reps: 12, rpe: 3 },
  { id: "8db68e9d-7ca3-472e-9af9-99c638b0949e", progression: "Aumentar tempo de isometria ou realizar com olhos fechados.", sets: 3, reps: 10, rpe: 5 }
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
    console.log("Batch update 4 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
