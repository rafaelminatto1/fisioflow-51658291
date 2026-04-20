import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "e6f88417-0639-49e1-851a-115a56758a96", progression: "Aumentar tempo de isometria ou realizar com olhos fechados.", sets: 3, reps: 10, rpe: 5 },
  { id: "2085e49d-db48-47a9-90cc-45db7c33709d", progression: "Aumento da resistência da banda ou posicionamento da banda nos tornozelos.", sets: 3, reps: 20, rpe: 7 },
  { id: "c8392015-d666-4626-a562-7e9de6474c95", progression: "Realizar contra resistência (massa terapêutica) ou aumentar a velocidade.", sets: 2, reps: 20, rpe: 4 },
  { id: "9eec7ecd-e16c-491a-9843-45c9fb9b3eeb", progression: "Aumentar tempo de isometria ou realizar com leve rotação associada.", sets: 3, reps: 10, rpe: 5 },
  { id: "8e3d37be-eb88-4a4a-8891-6fb0ee9f0ac3", progression: "Puxar levemente com a outra mão para intensificar ou realizar em pé.", sets: 3, reps: 30, rpe: 4 },
  { id: "3974836c-03ed-49a0-9aef-10e02c51621f", progression: "Aumentar a altura do apoio posterior ou segurar halteres.", sets: 3, reps: 10, rpe: 8 },
  { id: "85e6c2ad-6e77-4857-bda8-42c7ce0c2d95", progression: "Aumento de carga ou foco em profundidade controlada.", sets: 4, reps: 12, rpe: 7 },
  { id: "663e8b11-b463-4ad8-8280-3797c030d378", progression: "Adicionar caneleiras ou realizar com dorsiflexão ativa constante.", sets: 3, reps: 15, rpe: 4 },
  { id: "81b3cfe4-abd8-4bf1-a338-fe583aa407ed", progression: "Aumentar a resistência da banda ou realizar em diferentes planos escapulares.", sets: 3, reps: 15, rpe: 6 },
  { id: "211605de-5150-48e1-b003-de6d23b344fe", progression: "Aumentar a distância lateral ou a velocidade de reatividade.", sets: 3, reps: 10, rpe: 9 },
  { id: "7e2cb83e-3c78-4d8f-941f-e4745add4760", progression: "Variação unilateral ou em degrau para maior amplitude.", sets: 3, reps: 20, rpe: 6 },
  { id: "61ab52c6-cdf5-406b-b940-d7dbbfcecc05", progression: "Realizar com banda elástica para mobilização com movimento (MWM).", sets: 3, reps: 12, rpe: 3 },
  { id: "f3d6370e-8a90-49cb-840c-287997c35978", progression: "Ponte unilateral ou com calcanhares sobre bola suíça.", sets: 3, reps: 15, rpe: 5 },
  { id: "f319c5f4-888f-4858-ab9e-1efd4e9e7b42", progression: "Fechar os olhos ou realizar alcances funcionais (alcance à frente).", sets: 3, reps: 45, rpe: 5 },
  { id: "7cad6665-244c-4cd3-99c1-0b4025614503", progression: "Aumentar o tempo de isometria na base ou segurar halteres.", sets: 3, reps: 12, rpe: 7 },
  { id: "13918b7b-c13f-462f-99f2-b6e17c15ee52", progression: "Aumentar a carga ou focar na fase de máxima adução horizontal.", sets: 3, reps: 12, rpe: 7 },
  { id: "00b03826-fd00-4741-b4ba-3fe06c71cc34", progression: "Manter a expansão lateral durante atividades funcionais leves.", sets: 1, reps: 10, rpe: 2 },
  { id: "9749eff6-5362-48c3-9448-67e7d0dce8e8", progression: "Toes-to-bar ou realizar com pernas estendidas e pausa no topo.", sets: 3, reps: 10, rpe: 8 },
  { id: "73573738-bb4b-43ad-b67a-f78548ad210c", progression: "Aumentar a inclinação lateral com leve tração manual.", sets: 3, reps: 30, rpe: 3 }
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
    console.log("Batch update 8 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
