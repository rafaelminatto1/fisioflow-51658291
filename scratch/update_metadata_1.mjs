import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  {
    id: "092ddd12-0558-4b87-99a0-c073603eb1e5",
    progression: "Progressão de caminhada em linha reta para zigue-zague ou olhos fechados.",
    sets: 3,
    reps: 20,
    rpe: 5,
  },
  {
    id: "4ba7ec7b-8948-413e-8559-490dff6ae989",
    progression: "Tirar um braço, depois uma perna, depois braço e perna opostos (Perdigueiro).",
    sets: 3,
    reps: 10,
    rpe: 4,
  },
  {
    id: "b2a513c5-5da4-4d17-b0f8-ec63381a49a6",
    progression: "Ponte com calcanhares elevados ou progredir para ponte unilateral.",
    sets: 3,
    reps: 15,
    rpe: 6,
  },
  {
    id: "38e308f7-3da4-46cc-982b-ef5232ce1da1",
    progression: "Adicionar carga (halter/kettlebell) ou realizar com pausa na base.",
    sets: 4,
    reps: 12,
    rpe: 7,
  },
  {
    id: "d0c61d3a-873d-47a6-a334-b5edd603b31d",
    progression: "Usar suporte para descida controlada (box pistol) ou TRX para auxílio.",
    sets: 3,
    reps: 8,
    rpe: 9,
  },
  {
    id: "61dcaaf9-92ed-4224-b242-d2406a00e8ea",
    progression: "Aumento progressivo de carga ou foco em tempo (ex: 3s na descida).",
    sets: 4,
    reps: 10,
    rpe: 8,
  },
  {
    id: "7a349c3c-6a9b-43fb-bf86-525e5264210a",
    progression: "Afundo com carga bilateral ou afundo reverso para menor impacto no joelho.",
    sets: 3,
    reps: 12,
    rpe: 7,
  },
  {
    id: "b7a73f65-a68d-4aa1-a437-3ab7602a5192",
    progression: "Adicionar peso no tornozelo ou progredir para elevação de perna estendida (SLR).",
    sets: 3,
    reps: 10,
    rpe: 3,
  },
  {
    id: "f3d3f0f4-0366-42a4-9d6d-ce72d13f0fdb",
    progression: "Adicionar carga ou progredir para afundo caminhando.",
    sets: 3,
    reps: 12,
    rpe: 6,
  },
  {
    id: "6f44c9e0-4de7-412c-bb52-f73868fc3ee7",
    progression: "Segurar halteres ou aumentar a distância da passada.",
    sets: 3,
    reps: 20,
    rpe: 8,
  },
  {
    id: "230fe21d-6124-492c-a6be-2bff1e8ed40a",
    progression:
      "Realizar com elástico (mini-band) nos punhos ou em superfície instável (foam roller).",
    sets: 3,
    reps: 12,
    rpe: 4,
  },
  {
    id: "74ad1c8a-c300-419d-b6a0-4f331a98b611",
    progression: "Realizar em superfície instável (disco de equilíbrio) ou com mini-band.",
    sets: 3,
    reps: 10,
    rpe: 5,
  },
  {
    id: "a3374bca-1874-4ab9-b717-12498679f55a",
    progression: "Progressão de carga ou realização unilateral para correção de assimetrias.",
    sets: 3,
    reps: 15,
    rpe: 7,
  },
  {
    id: "b30cd552-25a9-42b3-a8a8-e006990e1ad5",
    progression: "Foco na fase excêntrica (descida lenta) ou variação unilateral.",
    sets: 3,
    reps: 15,
    rpe: 7,
  },
  {
    id: "998cb8b6-c230-40ba-9251-0a4b4aa9eb75",
    progression: "Progressão de carga com barra ou variação unilateral (Stiff unilateral).",
    sets: 4,
    reps: 10,
    rpe: 8,
  },
  {
    id: "a35d481b-5764-43ae-ac66-3f3500fb061c",
    progression: "Aumentar tempo de permanência ou realizar com uma perna estendida (unilateral).",
    sets: 3,
    reps: 45,
    rpe: 6,
  },
  {
    id: "794029e9-4902-47db-b7e9-7f547467a026",
    progression: "Aumentar altura do degrau ou segurar halteres.",
    sets: 3,
    reps: 12,
    rpe: 7,
  },
  {
    id: "e61cabcd-f72e-47fe-adb7-a394d8bac445",
    progression: "Realizar em degrau para maior amplitude ou variação unilateral.",
    sets: 3,
    reps: 20,
    rpe: 6,
  },
  {
    id: "831a4893-7d40-417b-8469-633910020002",
    progression: "Variações em 4 apoios (Gato-Camelo) ou com rotação torácica.",
    sets: 2,
    reps: 10,
    rpe: 3,
  },
  {
    id: "d68483d3-04e4-4f34-8e41-1a37635a141a",
    progression: "Aumentar a rotação do tronco para alongar peitoral simultaneamente.",
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
    console.log("Batch update completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
