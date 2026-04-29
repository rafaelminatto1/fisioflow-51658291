import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  {
    id: "e6f8a42c-123a-4a2b-bc6e-d2406a00e8ea",
    progression: "Aumentar a resistência da banda ou realizar em pé com foco em controle do arco.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "dd153c41-4535-4966-ac0a-7f457e90b0ab",
    progression: "Aumentar a velocidade do bombeamento ou realizar com pernas elevadas.",
    sets: 3,
    reps: 30,
    rpe: 2,
  },
  {
    id: "e93d18c5-6f31-4f4b-b76f-da556d762cb4",
    progression: "Aumentar o tempo de isometria ou realizar contra resistência manual.",
    sets: 3,
    reps: 10,
    rpe: 5,
  },
  {
    id: "ba6ce50d-fb5c-4c7c-bd0f-00aa21b04f3a",
    progression: "Puxar levemente com a outra mão para intensificar ou realizar em pé.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "24d82dd7-2f73-46db-aece-ded80cf13a46",
    progression: "Ponte unilateral ou com calcanhares sobre superfície instável.",
    sets: 3,
    reps: 15,
    rpe: 5,
  },
  {
    id: "59933cf5-7599-43de-8f69-606575f91b4f",
    progression:
      "Realizar em diferentes posturas para facilitar a depuração de diferentes lobos pulmonares.",
    sets: 2,
    reps: 5,
    rpe: 3,
  },
  {
    id: "d0f4adf7-5f02-4578-a120-e150fe0fc653",
    progression: "Realizar mobilização com banda elástica (distração) para ganhar mais ADM.",
    sets: 3,
    reps: 12,
    rpe: 4,
  },
  {
    id: "86219ef7-f9ba-43a9-9022-09d322ea4570",
    progression: "Adicionar caneleiras ou mini-band acima dos joelhos.",
    sets: 3,
    reps: 20,
    rpe: 6,
  },
  {
    id: "851e26fa-08a7-4dfe-848e-408184efb167",
    progression: "Variação unilateral ou em degrau para maior amplitude.",
    sets: 3,
    reps: 20,
    rpe: 6,
  },
  {
    id: "989da605-c597-4fb3-a5fc-d26048e15fff",
    progression: "Adicionar carga (halteres) ou progredir para avanço caminhando.",
    sets: 3,
    reps: 12,
    rpe: 7,
  },
  {
    id: "5465a626-f7a3-4541-94f7-5e281b9036ce",
    progression: "Realizar mobilizações em diferentes direções (superior, inferior, lateral).",
    sets: 2,
    reps: 10,
    rpe: 2,
  },
  {
    id: "ec506e09-826f-4f30-886c-b90d54ea4aa2",
    progression: "Aumento de carga gradual ou realização com elástico para resistência.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "2cd154da-2ec7-4da9-893a-1a301e4221cd",
    progression: "Aumentar a carga do halter ou usar martelo para maior alavanca.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "a025c68c-a3cb-45d6-82fb-2de5ad632766",
    progression: "Focar em alcançar pontos mais altos ou adicionar leve carga nos punhos.",
    sets: 3,
    reps: 10,
    rpe: 3,
  },
  {
    id: "f0ed5600-3b49-4d13-bee3-8eb5420c19a4",
    progression: "Aumentar a velocidade da caminhada ou realizar com obstáculos (step over).",
    sets: 3,
    reps: 20,
    rpe: 5,
  },
  {
    id: "3b2a0999-9ba6-4f4f-a037-bfb94551622f",
    progression: "Aumentar a resistência da banda ou focar em pausa na contração máxima.",
    sets: 3,
    reps: 15,
    rpe: 7,
  },
  {
    id: "524dca2d-cf76-4bbe-b68e-745859dc402d",
    progression: "Aumentar o tempo de isometria ou realizar com elevação de uma perna.",
    sets: 3,
    reps: 45,
    rpe: 4,
  },
  {
    id: "8537341a-aebe-4754-9990-03a74f215470",
    progression: "Usar handgrip de maior resistência ou realizar preensão de toalha molhada.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "2b9dae47-4a0a-44ca-8d9b-190b5a257234",
    progression: "Usar elásticos de dedos para resistência ou realizar em massa terapêutica.",
    sets: 3,
    reps: 15,
    rpe: 5,
  },
  {
    id: "6d0e2daf-d04c-4305-b554-e1369342435e",
    progression: "Aumentar a altura do step ou segurar halteres.",
    sets: 3,
    reps: 12,
    rpe: 7,
  },
  {
    id: "f32367e8-ce7e-45a4-ae5e-a8a3eb0056bf",
    progression: "Aumento progressivo de carga ou foco em tempo (excêntrica controlada).",
    sets: 3,
    reps: 15,
    rpe: 7,
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
    console.log("Batch update 9 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
