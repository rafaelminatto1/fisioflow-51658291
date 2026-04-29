import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  {
    id: "17c53541-8d77-40a7-96b3-24b3b47e41ce",
    progression: "Realizar mobilização com auxílio de bastão ou banda elástica.",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "1e2c3be0-288d-4858-ab94-345adf190ebd",
    progression: "Aumentar a velocidade de transição ou adicionar rotação torácica com alcance.",
    sets: 3,
    reps: 8,
    rpe: 6,
  },
  {
    id: "50d2fbe0-c7be-466b-a3bb-0c5e8c777feb",
    progression: "Ponte unilateral ou com calcanhares sobre superfície instável.",
    sets: 3,
    reps: 15,
    rpe: 5,
  },
  {
    id: "7de5e406-fd14-4b51-958d-0c26e9be6eca",
    progression: "Prancha dinâmica (tocar ombros) ou prancha lateral.",
    sets: 3,
    reps: 45,
    rpe: 6,
  },
  {
    id: "fbe63e9c-f8ec-4b82-aa8a-c6c2b3a4e4f7",
    progression: "Aumentar a velocidade da caminhada ou realizar em zigue-zague.",
    sets: 3,
    reps: 20,
    rpe: 5,
  },
  {
    id: "dcf3b879-b4c9-4f30-bf44-d66b14930d99",
    progression: "Realizar saltitando (skipping posterior) para maior intensidade.",
    sets: 3,
    reps: 30,
    rpe: 6,
  },
  {
    id: "81b9bb61-e0b5-4736-88a6-2a635d9a908b",
    progression: "Inclinar o tronco para frente para intensificar o alongamento.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "eff0c28a-e0ac-4611-abc7-cd4e6d1174db",
    progression: "Puxar a toalha para maior flexão de joelho ou realizar em pé.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "6937b976-3559-47d7-849d-7e022d483897",
    progression: "Aumentar a amplitude da rotação ou realizar com carga leve de tornozelo.",
    sets: 3,
    reps: 10,
    rpe: 5,
  },
  {
    id: "4bcd540f-67d4-4c4b-95d8-a44467da53cf",
    progression: "Aumentar tempo de expiração ou realizar em diferentes posturas (sentado/pé).",
    sets: 1,
    reps: 10,
    rpe: 2,
  },
  {
    id: "cc264b5f-0fb2-4e63-a0bd-de90c06f3e8c",
    progression: "Realizar com uso de faixa elástica ao redor das costelas para resistência.",
    sets: 1,
    reps: 10,
    rpe: 2,
  },
  {
    id: "89f92b8f-7af1-41bd-97db-afc5cf66a455",
    progression: "Manter a expansão durante atividades funcionais leves.",
    sets: 1,
    reps: 10,
    rpe: 3,
  },
  {
    id: "d4da6725-d1cb-43d4-8cc0-32ca4e15c7d2",
    progression: "Adicionar carga leve no tornozelo ou progredir para SLR.",
    sets: 3,
    reps: 15,
    rpe: 3,
  },
  {
    id: "f5fcfef9-bf3e-49df-86b5-6a78aaec8d62",
    progression: "Aumentar tempo de isometria ou realizar com braços cruzados no peito.",
    sets: 3,
    reps: 30,
    rpe: 7,
  },
  {
    id: "d6e3b771-45fe-4dfe-ac60-3f851e05dbf4",
    progression: "Aproximar mais o calcanhar da parede mantendo o joelho flexionado.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "f83eb075-c9cb-45e0-b8d8-a0a4cb28e141",
    progression: "Aumentar a velocidade da cabeça ou realizar sobre base instável.",
    sets: 3,
    reps: 60,
    rpe: 5,
  },
  {
    id: "473e742f-815e-4e09-a394-b346ccbdf42b",
    progression: "Manobra terapêutica; realizar conforme orientação clínica específica.",
    sets: 1,
    reps: 1,
    rpe: 4,
  },
  {
    id: "4175c57f-3a09-4dc1-b39d-cc1fbdd31072",
    progression: "Aumentar a amplitude de extensão de cotovelo ou punho gradualmente.",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "84839748-8811-4721-add6-5329446728cd",
    progression: "Aumentar a flexão de quadril ou a dorsiflexão durante o deslizamento.",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "2e1acd7d-c816-48f1-810a-f39c4e914ce3",
    progression: "Progredir amplitude de flexão de punho e inclinação cervical.",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "a8f63480-07c2-402e-af0f-77011fd9f6bf",
    progression: "Aumentar a flexão de cotovelo e a abdução de ombro gradualmente.",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "8258ea49-2021-4271-a3e6-14024657b1c0",
    progression: "Aumento de carga ou foco em isometria na extensão máxima.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "12f79b82-471b-460a-bc3a-452ce974de2a",
    progression: "Aumentar a resistência da toalha ou realizar com pesos sobre a toalha.",
    sets: 3,
    reps: 15,
    rpe: 4,
  },
  {
    id: "65d3e464-ba36-4594-92c5-970cf5a4a2a6",
    progression: "Aumentar a distância do alcance ou realizar em superfície instável.",
    sets: 3,
    reps: 10,
    rpe: 5,
  },
  {
    id: "0c71c989-d905-4617-a92f-cc32de6cce87",
    progression: "Aumentar a resistência da faixa ou realizar remada unilateral.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "d0ea84cb-9549-48ff-abef-22c63b522832",
    progression: "Aumentar a altura do salto ou a instabilidade da aterrissagem.",
    sets: 3,
    reps: 10,
    rpe: 8,
  },
  {
    id: "a1d17d0d-8464-4a12-85b1-44e82251d1b0",
    progression: "Flexão diamante ou flexão com pés elevados.",
    sets: 3,
    reps: 12,
    rpe: 8,
  },
  {
    id: "22f56dfc-0802-4828-b5ce-bcb1ec61c87a",
    progression: "Realizar com maior amplitude de movimento ou ritmo mais lento.",
    sets: 3,
    reps: 12,
    rpe: 3,
  },
  {
    id: "c773d10f-e2ed-4ca6-864a-f355a83ceeda",
    progression: "Reduzir o ângulo de inclinação ou progredir para flexão no solo.",
    sets: 3,
    reps: 15,
    rpe: 4,
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
    console.log("Batch update 7 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
