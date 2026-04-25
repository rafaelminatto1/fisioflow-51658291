import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  {
    id: "df77fa5b-306e-4053-91d2-a60cc0017411",
    progression: "Realizar em cima de um degrau para aumentar a extensão ou com braços elevados.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "63b1216c-631f-4e32-9762-effa9fff42e5",
    progression:
      "Aumento da resistência do elástico ou realização em diferentes ângulos de abdução.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "96cc9b30-d14a-4938-b490-4d2775343539",
    progression: "Aumentar a altura do degrau ou segurar halteres.",
    sets: 3,
    reps: 10,
    rpe: 7,
  },
  {
    id: "cc8fd0fd-1451-47ec-89a8-6cee64d1f5ab",
    progression: "Aumento da amplitude de descida controlada ou redução do suporte manual.",
    sets: 3,
    reps: 8,
    rpe: 9,
  },
  {
    id: "e618ac87-5ae5-42c4-8b02-9867b6c82199",
    progression:
      "Realizar com auxílio de bastão ou em diferentes graus de rotação externa passiva.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "acf2a152-86f3-4b04-95ec-4ff661ab8fdb",
    progression: "Fechar os olhos ou realizar movimentos de braço/perna oposta (alcances).",
    sets: 3,
    reps: 45,
    rpe: 5,
  },
  {
    id: "8ceed7b2-ac72-43d5-8d29-47c81e234897",
    progression: "Aumento progressivo de carga com barra ou variação unilateral.",
    sets: 4,
    reps: 10,
    rpe: 8,
  },
  {
    id: "e74298ae-21c3-4e6e-83a8-354c722c9d7e",
    progression: "Aumentar o diâmetro dos círculos ou realizar em posição de 4 apoios.",
    sets: 2,
    reps: 10,
    rpe: 3,
  },
  {
    id: "d5010b01-12b6-407c-993d-956e2d72e6f6",
    progression: "Realizar com pé sobre bola suíça ou com carga no quadril.",
    sets: 3,
    reps: 12,
    rpe: 7,
  },
  {
    id: "07054143-f680-433b-8b93-22b64469bd58",
    progression: "Adicionar caneleiras ou mini-band acima dos joelhos.",
    sets: 3,
    reps: 20,
    rpe: 6,
  },
  {
    id: "fa8a49b7-cfcd-4a77-84ec-ec345ecd08c5",
    progression: "Reduzir a altura da cadeira ou progredir para agachamento livre.",
    sets: 3,
    reps: 12,
    rpe: 5,
  },
  {
    id: "814e398e-8302-4007-9bbb-bc35459db703",
    progression: "Inclinar o tronco lateralmente para o lado oposto ao alongamento.",
    sets: 3,
    reps: 30,
    rpe: 4,
  },
  {
    id: "a5068f85-cf46-41c9-b1b0-e553f9fbe83e",
    progression:
      "Adicionar mini-band acima dos joelhos ou realizar em prancha lateral (concha avançada).",
    sets: 3,
    reps: 20,
    rpe: 6,
  },
  {
    id: "80a81042-412a-4a28-a7b2-641e92501e1a",
    progression: "Aumento da resistência da banda ou posicionamento da banda nos tornozelos/pés.",
    sets: 3,
    reps: 20,
    rpe: 7,
  },
  {
    id: "dcba2295-5810-48ad-b100-e7166eda0d5f",
    progression: "Realizar com abdução da perna superior (estrela) ou com rotação de tronco.",
    sets: 3,
    reps: 30,
    rpe: 7,
  },
  {
    id: "c06aef41-c29f-44d3-b06b-21c24ebdcd71",
    progression: "Adicionar caneleiras ou realizar em 4 apoios com perna estendida.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "bf41a9b5-fc3f-4110-8b71-0ef5d9aa4b6d",
    progression: "Realizar sobre superfície instável (espuma/disco) mantendo os olhos fechados.",
    sets: 3,
    reps: 30,
    rpe: 8,
  },
  {
    id: "7fb207a7-8139-49e6-a718-2b8ad591c305",
    progression: "Aumentar a altura do salto ou a velocidade de transição entre as pernas.",
    sets: 3,
    reps: 10,
    rpe: 9,
  },
  {
    id: "60911b03-c204-4f03-b33d-ddc5d4c23238",
    progression: "Progressão de carga ou variação unipodal em degrau.",
    sets: 3,
    reps: 20,
    rpe: 6,
  },
  {
    id: "c506feb8-88e3-49aa-b467-df018ba96402",
    progression: "Aumento de carga sobre os joelhos ou foco na fase excêntrica controlada.",
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
    console.log("Batch update 2 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
