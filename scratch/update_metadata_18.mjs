import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const updates = [
  { id: "90a7d17a-2a65-433a-b71e-fff217935641", progression: "Inclinar o corpo mais para frente para aumentar a tensão no tríceps.", sets: 3, reps: 30, rpe: 3 },
  { id: "94ed0c16-cb4e-4f24-812c-ada89aaa87cf", progression: "Adicionar peso no cinto ou realizar variações como Muscle-up.", sets: 3, reps: 10, rpe: 8 },
  { id: "0c2f993e-0331-400f-8c6b-3ca1c765c5fe", progression: "Manter as pernas mais estendidas ou realizar com braços acima da cabeça.", sets: 3, reps: 15, rpe: 6 },
  { id: "1b74c160-5442-4c67-a1db-16eed6846dc6", progression: "Realizar com pernas elevadas ou adicionar rotação com carga (Russian Twist).", sets: 3, reps: 15, rpe: 6 },
  { id: "296c9330-4818-4cc4-9c77-ccd1030952ce", progression: "Avanço com carga (halteres) ou afundo búlgaro (pé posterior elevado).", sets: 3, reps: 12, rpe: 6 },
  { id: "56b512a2-f095-4c5f-94db-c7a31ecb9e18", progression: "Aumentar a amplitude lateral e adicionar carga no peito (Goblet).", sets: 3, reps: 12, rpe: 6 },
  { id: "70f736f0-8a3b-4984-af93-c48ac192c748", progression: "Aumentar a velocidade dos socos e profundidade do agachamento.", sets: 3, reps: 20, rpe: 7 },
  { id: "3f5ce2d6-5a7e-4bc2-b048-cd2144afee7b", progression: "Agachamento com barra (Costas ou Frente) ou com pausa na base.", sets: 3, reps: 12, rpe: 6 },
  { id: "a4126950-a670-40ba-96d0-b801390befc9", progression: "Aumentar a velocidade ou realizar agachamento com salto (Jump Squat).", sets: 3, reps: 20, rpe: 5 },
  { id: "d7feba14-d7dd-416f-862e-69b604d371d5", progression: "Aumentar o tempo sob tensão ou realizar variações de rotação interna.", sets: 2, reps: 60, rpe: 3 },
  { id: "6b574243-5a72-44bd-b143-bdf5c8976940", progression: "Realizar com foco em manter a coluna neutra e joelho estendido.", sets: 3, reps: 30, rpe: 4 },
  { id: "46065bd9-070c-48c0-89c2-74dcab4de78e", progression: "Realizar com joelho levemente flexionado.", sets: 3, reps: 30, rpe: 4 },
  { id: "a621e7bf-7b02-4b2c-83b8-b3f81e4fae95", progression: "Variar a altura do braço na moldura para focar em diferentes feixes.", sets: 3, reps: 30, rpe: 3 },
  { id: "5559e99d-bc89-47eb-b4c2-0960e21e0346", progression: "Inclinar o tronco mais à frente para maior amplitude.", sets: 3, reps: 30, rpe: 3 },
  { id: "24c00b51-2456-4701-b2c8-3f799d045d3d", progression: "Realizar sobre bolinha de tênis/massagem para liberação miofascial.", sets: 3, reps: 30, rpe: 4 },
  { id: "7c602d5c-bbbb-4ddb-97d0-6ebcc3ddfa20", progression: "Realizar com inclinação lateral e rotação cervical assistida.", sets: 3, reps: 30, rpe: 3 },
  { id: "f57ceaf7-b527-4b2c-b74f-f6a1411e2aa4", progression: "Aumentar o tempo de sustentação ou realizar inversão contra banda.", sets: 3, reps: 10, rpe: 4 },
  { id: "34dd0feb-bc0a-4280-bf20-1f241ae2ce75", progression: "Aumentar a velocidade e intensidade dos golpes.", sets: 3, reps: 60, rpe: 7 },
  { id: "6bc8caa0-645b-469e-b7e8-4aa18d336761", progression: "Adicionar o salto final ou realizar a flexão de braço no solo.", sets: 3, reps: 10, rpe: 8 },
  { id: "620fc8d3-0d28-4499-9102-6a9a3e86d5d9", progression: "Adicionar carga sobre os joelhos ou realizar no degrau (maior ADM).", sets: 3, reps: 15, rpe: 5 },
  { id: "9e380020-c4fd-4365-8473-c61ae50d9629", progression: "Focar na dissociação segmentar da coluna.", sets: 2, reps: 12, rpe: 2 },
  { id: "0d194359-daa9-4579-b24d-b31d0b7e0312", progression: "Aumentar a distância dos alcances ou realizar em base instável.", sets: 3, reps: 12, rpe: 5 },
  { id: "d793fc85-be13-4267-b5fd-2defd5218a57", progression: "Manter a contração por mais tempo (isometria).", sets: 3, reps: 10, rpe: 3 },
  { id: "f5301e49-9396-4fc4-8198-9e69b06a807e", progression: "Realizar em pé com maior velocidade e amplitude de joelhos.", sets: 3, reps: 30, rpe: 4 },
  { id: "51cdeee6-ca28-4e1a-800e-c7262504fb03", progression: "Adicionar estímulos visuais ou tarefas cognitivas associadas.", sets: 3, reps: 60, rpe: 4 },
  { id: "7e20d7ff-13ee-45ec-9f2a-1cf1ac37b3d8", progression: "Aumentar o controle em cada fase da rotação articular.", sets: 2, reps: 5, rpe: 4 },
  { id: "2e57d2da-071a-4c73-889a-faa456447738", progression: "Aumentar a velocidade e profundidade do deslocamento.", sets: 3, reps: 30, rpe: 7 },
  { id: "e9a54ab2-a99b-4b10-b548-f2b643fdea45", progression: "Aumentar a carga do halter ou focar no controle excêntrico.", sets: 3, reps: 12, rpe: 6 },
  { id: "6e6fa606-3248-4a8f-a015-ae0026fae84a", progression: "Fechar os olhos ou realizar movimentos funcionais (alcances).", sets: 3, reps: 60, rpe: 6 },
  { id: "f9e420fc-7da5-479c-a850-beedeca1c86b", progression: "Fechar os olhos ou realizar sobre superfície de espuma/disco.", sets: 3, reps: 60, rpe: 5 },
  { id: "10abc60f-3bec-40ce-9261-e26b2e42f5f3", progression: "Adicionar caneleiras ou realizar contra resistência de banda elástica.", sets: 3, reps: 12, rpe: 6 },
  { id: "4e0439b7-6214-4783-8649-8f1e704f9628", progression: "Aumentar o tempo de descida controlada.", sets: 3, reps: 5, rpe: 8 },
  { id: "3e42027b-5eec-4da2-abc2-747262861148", progression: "Realizar no degrau para maior amplitude de dorsiflexão.", sets: 3, reps: 12, rpe: 6 },
  { id: "de6daecf-7e3a-497e-a9a9-41b6a97d3ed8", progression: "Prancha dinâmica ou com carga sobre a região lombar.", sets: 3, reps: 45, rpe: 7 },
  { id: "92b3a045-151d-4ad1-aa0a-2c9058e7331d", progression: "Aumentar o peso da caneleira ou o tempo de isometria terminal.", sets: 3, reps: 15, rpe: 4 },
  { id: "5fe5c76e-0afc-4ad8-9174-1e89c7fe83c6", progression: "Reduzir o suporte manual até a subida livre.", sets: 3, reps: 15, rpe: 4 },
  { id: "69f345ad-dfbe-42e7-b476-fae3c48b12e6", progression: "Aumentar a carga do halter ou resistência da banda elástica.", sets: 3, reps: 15, rpe: 5 },
  { id: "731f8406-6101-4dbe-ae0e-706caeca6f60", progression: "Integrar com atividades de mobilização torácica leve.", sets: 1, reps: 10, rpe: 1 },
  { id: "0c9b37a4-2fef-487f-b746-fce035272b10", progression: "Aumentar a tensão da banda ou carga no halter.", sets: 3, reps: 12, rpe: 6 },
  { id: "bbfab6d3-4108-44b1-867a-4bf8d3e17514", progression: "Aumentar a espessura da toalha ou usar toalha molhada (maior resistência).", sets: 3, reps: 10, rpe: 5 },
  { id: "705de1c3-7aa2-4b32-bf9f-2bb903e79450", progression: "Fechar os olhos ou realizar alcances com as mãos.", sets: 3, reps: 8, rpe: 7 },
  { id: "e3b2b395-8c80-4ad0-a9d1-62170cd41446", progression: "Realizar o movimento com maior carga ou base unipodal.", sets: 3, reps: 12, rpe: 4 },
  { id: "7fc51511-d748-40e8-8a1d-620bf1781e0a", progression: "Adicionar extensão torácica assistida com pesos leves.", sets: 2, reps: 10, rpe: 4 },
  { id: "79d3afbb-49a6-4957-ae4a-38477cbdf58f", progression: "Aumentar a amplitude de rotação ou segurar peso na mão móvel.", sets: 3, reps: 10, rpe: 4 },
  { id: "c5e626d6-48c5-46be-bd29-0e0a800bbbd9", progression: "Aumentar a tensão da banda ou realizar com joelhos mais flexionados.", sets: 3, reps: 20, rpe: 6 },
  { id: "b20df563-5a86-42f3-b69e-376f961ff70b", progression: "Carga unilateral (Suitcase Carry) para maior desafio de core.", sets: 3, reps: 60, rpe: 7 },
  { id: "f31824d4-ce62-4c4a-80ea-2b248041de7d", progression: "Realizar com bastão para guiar a amplitude final.", sets: 3, reps: 12, rpe: 3 },
  { id: "32ab5f26-a92f-476d-98a2-8d461d45bb39", progression: "Aumentar a inclinação cervical ou a dorsiflexão no ponto de tensão.", sets: 3, reps: 10, rpe: 4 },
  { id: "d513c74d-5adf-4ae2-872b-5a80d26f5a00", progression: "Aumentar a carga gradualmente mantendo a técnica.", sets: 3, reps: 10, rpe: 8 },
  { id: "dc9d2b2a-6836-4d4d-9b62-ac80b22d7c54", progression: "Aumentar a resistência da banda ou focar em isometria.", sets: 3, reps: 12, rpe: 6 },
  { id: "75ea596d-7506-43fc-b4f7-b86a97ac0583", progression: "Progredir amplitude de extensão de punho e inclinação cervical.", sets: 3, reps: 12, rpe: 3 },
  { id: "9285358c-8172-4389-af39-4ca0f67f1a96", progression: "Aumentar a velocidade ou realizar saltos duplos.", sets: 3, reps: 60, rpe: 7 },
  { id: "30d75609-e612-4cb8-a9f8-018e6156a2db", progression: "Fechar os olhos ou carregar pesos nas mãos.", sets: 3, reps: 60, rpe: 5 },
  { id: "f81327c9-a0a0-4bb1-8a75-31659c051516", progression: "Aumentar a amplitude com assistência de bastão.", sets: 3, reps: 12, rpe: 3 },
  { id: "4f3a3e90-6240-4fd7-84ba-959830031184", progression: "Aumentar o peso da bola ou a velocidade do movimento.", sets: 3, reps: 10, rpe: 8 },
  { id: "8a7ffd62-5075-453c-89e6-057843dcb8e1", progression: "Aumentar a velocidade ou adicionar rotação do tronco.", sets: 3, reps: 30, rpe: 4 },
  { id: "a333405d-3745-47fd-89e6-f80e1553526d", progression: "Aumentar a rotação do quadril e amplitude torácica.", sets: 3, reps: 30, rpe: 4 },
  { id: "79739c5b-4d8d-4e20-b064-ee1c1aa4bc5e", progression: "Aumentar a tensão da banda ou focar em isometria.", sets: 3, reps: 12, rpe: 6 },
  { id: "81cadc1c-8ff5-4093-abd1-713f133fb4ca", progression: "Aumentar a velocidade ou adicionar resistência de banda nos joelhos.", sets: 3, reps: 15, rpe: 5 },
  { id: "ab7fa768-9f2b-4171-96e4-8db1bce61c87", progression: "Aumentar o tempo de sustentação.", sets: 3, reps: 15, rpe: 9 },
  { id: "55be11db-c9c8-482f-bc30-f0e57f4e7b72", progression: "Aumentar a velocidade ou realizar com pesos de tornozelo.", sets: 3, reps: 30, rpe: 5 },
  { id: "533a69d8-7fb5-44a5-a51d-721fba253192", progression: "Aumentar a carga do halter ou a velocidade do movimento.", sets: 3, reps: 15, rpe: 4 },
  { id: "3f5976ad-ae6b-45e9-b7de-6c0f80f00504", progression: "Aumentar a carga do halter ou resistência da banda.", sets: 3, reps: 15, rpe: 4 },
  { id: "5eca0c6e-41ba-4ed5-93c1-fb5ae4660db0", progression: "Realizar com pernas estendidas ou com carga sobre o colo.", sets: 3, reps: 12, rpe: 7 },
  { id: "23fb8e81-b882-46f7-b923-db6cab7ae954", progression: "Aumentar a amplitude gradualmente.", sets: 3, reps: 12, rpe: 3 },
  { id: "5638e403-b106-4451-8b98-f14c049447d2", progression: "Aumentar o tempo de alongamento ou focar em retroversão pélvica.", sets: 3, reps: 30, rpe: 4 },
  { id: "f5a45273-0528-443c-8b47-add6b7f4d054", progression: "Aumentar o tempo de isometria na compressão.", sets: 3, reps: 15, rpe: 4 },
  { id: "e57a3517-b93f-4dfc-9a36-7155521d1d0e", progression: "Avançar nas posturas de alongamento conforme flexibilidade.", sets: 1, reps: 600, rpe: 5 },
  { id: "f42beb4a-d66a-4024-b45d-7727b5d69352", progression: "Aumentar a tensão da banda ou realizar com maior amplitude lateral.", sets: 3, reps: 15, rpe: 6 },
  { id: "e7b7fe16-e2d7-42f5-8650-eb4ea6d4b5da", progression: "Realizar com uma perna elevada (unipodal) ou fechar os olhos.", sets: 3, reps: 12, rpe: 7 },
  { id: "50beed4a-b853-4ba5-a16a-ca1e6da28c3d", progression: "Variar a angulação do braço na porta.", sets: 3, reps: 30, rpe: 3 },
  { id: "d029f7ce-9617-4f04-9834-3faa425a9d3e", progression: "Aumentar a tensão da toalha mantendo a coluna neutra.", sets: 3, reps: 30, rpe: 4 },
  { id: "2977395c-8997-4a1c-a7a9-d188de10a2a7", progression: "Aumentar a complexidade das tarefas funcionais em auto-correção.", sets: 3, reps: 10, rpe: 4 },
  { id: "8371d239-46d5-45e4-98d4-5c350d76ba9b", progression: "Adicionar banda elástica acima dos joelhos ou realizar em pé (unipodal).", sets: 3, reps: 15, rpe: 6 },
  { id: "3f1aba01-9a6b-4569-b152-19ec1164cdfd", progression: "Aumentar a altura do degrau ou a explosividade do salto secundário.", sets: 3, reps: 6, rpe: 9 },
  { id: "54792e1d-0a12-4d3a-b70d-7edc674df6ea", progression: "Fechar os olhos ou realizar com tarefas cognitivas/motoras associadas.", sets: 3, reps: 60, rpe: 6 },
  { id: "230ba5be-9b9b-4e33-989c-33175b477d37", progression: "Adicionar mini-band nos punhos ou realizar em base instável.", sets: 3, reps: 12, rpe: 4 }
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
    console.log("Batch update 18 (Final) completed.");
  } catch (err) {
    console.error("Update Error:", err.message);
  }
}

update();
