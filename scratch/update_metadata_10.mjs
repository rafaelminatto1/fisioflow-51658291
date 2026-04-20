import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "3772c13d-9a3f-4938-96e4-b33d725e4346", progression: "Aumentar a resistência da banda ou realizar em pé com foco em controle do arco.", sets: 3, reps: 15, rpe: 6 },
  { id: "f6dc95d4-dc8d-4169-b717-f9bfd1ba62cc", progression: "Aumentar a amplitude de flexão gradualmente ou progredir para flexão ativa com carga.", sets: 3, reps: 12, rpe: 3 },
  { id: "54a5abf8-892a-4ee7-a1ba-860b956e7eb7", progression: "Aumento progressivo de carga ou foco em tempo (isometria no topo).", sets: 3, reps: 12, rpe: 8 },
  { id: "ed0d2a9e-281f-41fd-b314-29dd5d6b18b2", progression: "Focar em pontos de gatilho por mais tempo ou realizar movimentos lentos.", sets: 2, reps: 60, rpe: 5 },
  { id: "e5b40a4b-ee8b-483f-b45f-40a23a769a4b", progression: "Realizar com olhos fechados ou segurando carga leve (halteres).", sets: 3, reps: 5, rpe: 7 },
  { id: "cc02bbba-113d-433f-a70c-9590b3bdbd74", progression: "Aumentar tempo de isometria ou realizar movimentos de braço em 'V' e 'T'.", sets: 3, reps: 10, rpe: 5 },
  { id: "65294274-2f04-4df3-be5e-fe426b1cc950", progression: "Pernas estendidas (alavanca longa) ou com caneleiras.", sets: 3, reps: 15, rpe: 6 },
  { id: "c6feba6e-0b50-4a08-b8e8-fece0019d07d", progression: "Aumentar a amplitude de flexão/extensão ou realizar com olhos fechados.", sets: 2, reps: 12, rpe: 3 },
  { id: "3a8c0b21-2903-4c4a-99a7-fd401de3ffcc", progression: "Realizar em pé com foco em retroversão pélvica.", sets: 3, reps: 30, rpe: 4 },
  { id: "9e20767b-ba39-4407-9c90-3a348ba150c5", progression: "Usar bola de maior densidade ou realizar com movimentos rápidos de dedos.", sets: 3, reps: 20, rpe: 4 },
  { id: "f87d9c7a-9b35-4235-b7a0-59ef2d3f0f20", progression: "Realizar com olhos fechados ou segurando pesos leves.", sets: 3, reps: 3, rpe: 7 },
  { id: "2b854366-2ddc-4edf-b157-d7881d4d9594", progression: "Aumento de carga ou foco em descida controlada (3s).", sets: 3, reps: 12, rpe: 7 },
  { id: "205ef2f5-83b5-41c0-932b-d6e8b8a53f29", progression: "Aumentar a altura do salto ou a velocidade de transição.", sets: 3, reps: 10, rpe: 8 },
  { id: "b6a0717c-87af-4d36-a237-7fb215b33345", progression: "Aumentar a amplitude de extensão de cotovelo ou punho gradualmente.", sets: 3, reps: 12, rpe: 3 },
  { id: "a2129d7d-6679-443b-ac47-5e2063309f36", progression: "Realizar com tempo (máximo de repetições em 30s) ou com carga frontal.", sets: 3, reps: 5, rpe: 6 },
  { id: "7d5a4d7d-9386-450e-91f7-5bfe6e70e12e", progression: "Aumentar o número de repetições ou realizar com carga elástica nas costas.", sets: 3, reps: 15, rpe: 6 },
  { id: "cc193885-c225-4308-961d-6344ba96bcd9", progression: "Aumentar a velocidade das posições ou realizar contra resistência leve.", sets: 3, reps: 10, rpe: 3 },
  { id: "2da02ebe-d89c-46ba-bdcc-1453c30a89a4", progression: "Aumentar a altura da caixa ou realizar saltos reativos seguidos.", sets: 3, reps: 8, rpe: 9 },
  { id: "9cbff473-4215-4a0e-9fbd-2ddfbed8ddf4", progression: "Adicionar mini-band ou caneleiras; focar em controle pélvico.", sets: 3, reps: 15, rpe: 6 },
  { id: "75f231ba-b352-42ff-b8a9-b7c76545c9d6", progression: "Progredir para flexão com joelhos fora do solo.", sets: 3, reps: 15, rpe: 5 },
  { id: "b2c15717-dfe9-4078-a678-0ece6f3a1ec1", progression: "Puxar a perna para maior adução ou realizar sentado inclinado.", sets: 3, reps: 30, rpe: 4 }
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
    console.log("Batch update 10 completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
