const { neon } = require("@neondatabase/serverless");

const DATABASE_URL =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";

const enrichmentData = [
  {
    slug: "alongamento-romboides-sentado",
    instructions:
      'Posicionamento: Sentado em uma cadeira, cruze os braços à frente do peito, segurando os ombros opostos ou entrelace as mãos e empurre-as para frente.\nExecução: Incline a cabeça ligeiramente para frente e "abra" as escápulas, sentindo o alongamento na parte superior das costas. Segure por 30 segundos.\nRespiração: Respire profundamente, expandindo a região entre as escápulas na inspiração.\nDicas: Não encolha os ombros em direção às orelhas; mantenha-os baixos.',
  },
  {
    slug: "bicep-curl-martelo",
    instructions:
      "Posicionamento: Em pé, segurando halteres ao lado do corpo com as palmas voltadas para as coxas (pegada neutra).\nExecução: Flexione os cotovelos trazendo os pesos em direção aos ombros, mantendo a pegada neutra. Retorne lentamente.\nRespiração: Expire ao subir o peso e inspire ao descer.\nDicas: Mantenha os cotovelos colados ao tronco e evite balançar o corpo.",
  },
  {
    slug: "alongamento-subescapular",
    instructions:
      "Posicionamento: Em pé, coloque um braço atrás das costas (na altura da lombar).\nExecução: Com a outra mão, segure suavemente o cotovelo do braço posicionado e puxe-o para frente, sentindo o alongamento na frente do ombro e na axila.\nRespiração: Expire ao realizar a tração e mantenha a respiração fluida.\nDicas: Não force o movimento; deve ser um alongamento suave e controlado.",
  },
  {
    slug: "alongamento-tensor-fascia-lata",
    instructions:
      "Posicionamento: Em pé, cruze a perna que deseja alongar atrás da perna de apoio.\nExecução: Incline o tronco para o lado oposto à perna de trás, empurrando o quadril para fora até sentir o alongamento na lateral da coxa.\nRespiração: Tente relaxar na posição durante a expiração.\nDicas: Use uma parede como apoio para maior equilíbrio.",
  },
  {
    slug: "alongamento-triceps-sentado",
    instructions:
      "Posicionamento: Sentado com a coluna ereta, eleve um braço e dobre o cotovelo, levando a mão em direção às costas.\nExecução: Com a mão oposta, empurre suavemente o cotovelo para baixo e para trás. Segure por 30 segundos.\nRespiração: Expire ao aplicar a pressão suave no cotovelo.\nDicas: Mantenha a cabeça erguida; evite empurrar o queixo contra o peito.",
  },
  {
    slug: "alongamento-triceps-toalha",
    instructions:
      "Posicionamento: Em pé, segure uma toalha com uma mão acima da cabeça e deixe-a cair pelas costas.\nExecução: Com a outra mão por baixo, segure a toalha e puxe suavemente para baixo, alongando o tríceps do braço superior.\nRespiração: Respire suavemente enquanto mantém a tração.\nDicas: Mantenha a coluna neutra e evite arquear a lombar.",
  },
  {
    slug: "barra-fixa-pronada",
    instructions:
      "Posicionamento: Pendure-se na barra com as palmas das mãos voltadas para frente, braços mais largos que a largura dos ombros.\nExecução: Puxe o corpo para cima até o queixo passar da barra. Desça com controle até estender quase totalmente os braços.\nRespiração: Solte o ar ao subir e inspire ao descer.\nDicas: Foque em puxar os cotovelos para baixo e para trás; mantenha o abdômen firme.",
  },
  {
    slug: "avanco-com-salto",
    instructions:
      "Posicionamento: Comece em posição de avanço (uma perna à frente, outra atrás).\nExecução: Salte de forma explosiva, trocando a posição das pernas no ar e aterrissando suavemente em um novo avanço.\nRespiração: Expire no momento do salto e inspire na aterrissagem.\nDicas: Foque na estabilidade do joelho e na aterrissagem suave (pés silenciosos).",
  },
  {
    slug: "avanco-reverso-halteres",
    instructions:
      "Posicionamento: Em pé, segurando halteres ao lado do corpo.\nExecução: Dê um passo largo para trás e desça o joelho de trás em direção ao chão até que ambos os joelhos formem ângulos de 90 graus. Retorne à posição inicial.\nRespiração: Inspire ao descer e expire ao subir.\nDicas: Mantenha o tronco ereto e o joelho da frente alinhado com o tornozelo.",
  },
  {
    slug: "avanco-com-halteres",
    instructions:
      "Posicionamento: Em pé, segurando halteres ao lado do corpo.\nExecução: Dê um passo largo para frente e flexione os joelhos até que o joelho de trás quase toque o chão. Retorne empurrando o pé da frente.\nRespiração: Inspire ao afundo e expire ao retornar.\nDicas: Não deixe o joelho da frente ultrapassar a linha da ponta do pé.",
  },
  {
    slug: "alongamento-triceps-parede",
    instructions:
      "Posicionamento: Em pé de frente para uma parede, apoie o cotovelo flexionado contra a parede, mão apontando para as costas.\nExecução: Incline o corpo para frente e para baixo, usando a parede como alavanca para alongar o tríceps.\nRespiração: Expire ao inclinar o corpo para o alongamento.\nDicas: Mantenha o braço próximo à orelha.",
  },
  {
    slug: "bicep-curl-alternado",
    instructions:
      "Posicionamento: Em pé, com halteres ao lado do corpo, palmas voltadas para dentro.\nExecução: Flexione um cotovelo de cada vez, girando a palma da mão para cima durante o movimento. Alterne entre os braços.\nRespiração: Expire ao subir o peso e inspire ao retornar.\nDicas: Evite o uso de impulso ou balanço dos ombros.",
  },
  {
    slug: "ankle-inversion-isometric",
    instructions:
      "Posicionamento: Sentado, coloque o pé contra um objeto fixo (como o pé de uma mesa ou a outra perna).\nExecução: Pressione a borda interna do pé contra o objeto, tentando realizar o movimento de inversão sem que o pé se mova. Mantenha a contração por 5-10 segundos.\nRespiração: Mantenha a respiração contínua; não prenda o fôlego durante a contração.\nDicas: Foque na ativação dos músculos internos da perna e tornozelo.",
  },
  {
    slug: "barra-fixa-supinada",
    instructions:
      "Posicionamento: Segure na barra com as palmas das mãos voltadas para você, largura dos ombros.\nExecução: Puxe o corpo para cima até o queixo passar da barra. Desça lentamente.\nRespiração: Expire na subida e inspire na descida controlada.\nDicas: Mantenha os ombros longe das orelhas.",
  },
  {
    slug: "avanco-isometrico",
    instructions:
      "Posicionamento: Posicione-se em um avanço (afundo).\nExecução: Desça até que o joelho de trás esteja próximo ao chão e mantenha a posição estática pelo tempo determinado.\nRespiração: Respire profundamente para manter a oxigenação muscular no esforço.\nDicas: Mantenha o tronco vertical e o peso distribuído entre as duas pernas.",
  },
];

async function enrich() {
  const sql = neon(DATABASE_URL);
  try {
    console.log("🚀 Iniciando enriquecimento clínico para o Batch 6 (Verified List)...");

    for (const exercise of enrichmentData) {
      const res = await sql`
                UPDATE exercises
                SET instructions = ${exercise.instructions}
                WHERE slug = ${exercise.slug}
                RETURNING name
            `;
      if (res.length > 0) {
        console.log(`✅ Atualizado: ${res[0].name} (${exercise.slug})`);
      } else {
        console.warn(`⚠️ Exercício não encontrado: ${exercise.slug}`);
      }
    }

    console.log("✨ Enriquecimento clínico concluído!");
  } catch (err) {
    console.error("❌ Erro durante o enriquecimento:", err);
  }
}

enrich();
