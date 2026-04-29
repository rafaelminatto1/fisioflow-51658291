import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  {
    id: "e067c293-80b1-419b-af5a-ef5f6f6916a4",
    progression: "Aumentar a inclinação do tronco ou realizar círculos maiores com peso leve.",
    sets: 3,
    reps: 60,
    rpe: 2,
  },
  {
    id: "98be9031-7299-4447-926d-209460db708b",
    progression:
      "Realizar com movimentos de braço/perna alternados mais rápidos ou com carga leve.",
    sets: 3,
    reps: 12,
    rpe: 6,
  },
  {
    id: "f3d6370e-8a90-49cb-840c-287997c35978",
    progression: "Ponte unilateral ou com calcanhares sobre bola suíça.",
    sets: 3,
    reps: 15,
    rpe: 5,
  },
  {
    id: "7de5e406-fd14-4b51-958d-0c26e9be6eca",
    progression: "Prancha dinâmica (tocar ombros) ou prancha com elevação de perna.",
    sets: 3,
    reps: 45,
    rpe: 7,
  },
  {
    id: "0513186d-aaca-4001-8047-2e9cbed2f213",
    progression: "Fechar os olhos ou realizar alcances funcionais enquanto mantém o equilíbrio.",
    sets: 3,
    reps: 60,
    rpe: 6,
  },
  {
    id: "577b7d6e-b3c3-431a-9d85-9addd133f3c9",
    progression: "Aumentar a carga do halter ou focar em contração excêntrica lenta.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "1b9a842c-123a-4a2b-bc6e-d2406a00e8ea",
    progression: "Aumentar a resistência da banda ou focar no controle excêntrico do movimento.",
    sets: 3,
    reps: 12,
    rpe: 6,
  },
  {
    id: "55116247-ab76-40f8-a3ba-195d5bbd77e7",
    progression: "Inclinar o tronco mais à frente ou realizar em pé com perna elevada.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "7ac7964d-bfea-4ea0-8419-425577b880e1",
    progression: "Realizar em pé com foco em retroversão pélvica.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "bdbf8be7-c330-4afe-99e3-e10c9a9a810d",
    progression: "Avanço profundo mantendo o tronco ereto e retroversão pélvica.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "6c6b60cb-347b-4317-8e49-449f9cea9d2b",
    progression: "Realizar com braços em diferentes ângulos para focar em fibras variadas.",
    sets: 3,
    reps: 30,
    rpe: 3,
  },
  {
    id: "cd0ea681-c92c-4006-bdd7-5afc3c868bab",
    progression: "Adicionar mini-band nos punhos ou realizar em base unipodal.",
    sets: 3,
    reps: 12,
    rpe: 4,
  },
  {
    id: "32ec0a99-c6c3-4f21-98d2-9aee0d31c27f",
    progression: "Cruzar a perna mais profundamente ou realizar sentado inclinado.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "b2baee7b-8594-4298-8056-20946cdf57ba",
    progression: "Aumentar o tempo de isometria em cada posição.",
    sets: 3,
    reps: 10,
    rpe: 5,
  },
  {
    id: "8ec340fb-073f-4ddb-9a34-bbc3ce276b65",
    progression: "Aumentar a amplitude lateral gradualmente.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "722d9c76-6769-4b1e-ad1f-57cb0070448b",
    progression: "Realizar com joelho estendido em degrau.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "7a79f8b3-2931-4618-a7ce-1063702a8aa8",
    progression: "Realizar com joelho levemente flexionado.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "bc69e40a-c984-4635-9489-45412917f13e",
    progression: "Progredir para Nível 2 (dinâmico).",
    sets: 3,
    reps: 10,
    rpe: 6,
  },
  {
    id: "c5da19e8-e549-4bdd-8e82-5a87b7759c4f",
    progression: "Aumentar a velocidade de descida mantendo o controle.",
    sets: 3,
    reps: 10,
    rpe: 5,
  },
  {
    id: "42347676-72ce-401d-b294-952ba9661e10",
    progression: "Realizar na moldura da porta para maior amplitude.",
    sets: 3,
    reps: 30,
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
    console.log("Batch update 12 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
