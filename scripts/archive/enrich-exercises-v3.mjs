import { neon } from "@neondatabase/serverless";

const DATABASE_URL =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";

const enrichmentData = [
  {
    slug: "alongamento-romboides-sentado",
    instructions:
      "### Guia Passo a Passo: Alongamento de Romboides Sentado\n\n1.  **Posicionamento**: Sente-se em uma cadeira firme com os pés apoiados no chão e a coluna ereta.\n2.  **Preparação dos Braços**: Cruze os braços à frente do corpo, segurando a parte de trás dos ombros opostos ou, se preferir, entrelace as mãos e empurre-as para frente, mantendo os braços na altura do peito.\n3.  **Execução**: Incline levemente a cabeça para frente e projete o esterno (osso do peito) para trás, arredondando a parte superior das costas. Tente 'afastar' as escápulas uma da outra.\n4.  **Manutenção**: Sustente o alongamento por 20 a 30 segundos, respirando profundamente.\n5.  **Relaxamento**: Solte os braços lentamente e retorne à posição inicial.",
    description:
      "Alongamento específico para os músculos entre as escápulas (romboides), ideal para aliviar tensões posturais e dores na parte superior das costas.",
    tips: [
      "Mantenha os ombros relaxados, evitando que subam em direção às orelhas.",
      "Respire profundamente para ajudar os músculos a relaxarem durante o alongamento.",
      "Foque na sensação de abertura entre as escápulas.",
    ],
    precautions: [
      "Evite se houver dor aguda na coluna cervical ou torácica.",
      "Não force o movimento se sentir formigamento nos braços.",
    ],
    benefits: [
      "Alívio de tensão nos músculos romboides e trapézio médio.",
      "Melhora da mobilidade das escápulas.",
      "Auxílio na correção postural (cifose torácica).",
    ],
  },
  {
    slug: "avanco-com-salto",
    instructions:
      "### Guia Passo a Passo: Avanço com Salto (Jumping Lunges)\n\n1.  **Posição Inicial**: Comece em uma posição de afundo (lunge), com um pé à frente e o outro atrás, ambos os joelhos flexionados a 90 graus.\n2.  **O Salto**: Salte explosivamente para cima, estendendo os quadris e joelhos simultaneamente.\n3.  **A Troca**: No ar, troque a posição das pernas de forma rápida e coordenada.\n4.  **Aterrissagem**: Pouse suavemente na posição de afundo oposta, absorvendo o impacto através dos pés e joelhos.\n5.  **Continuidade**: Repita o movimento de forma alternada e rítmica.",
    description:
      "Exercício pliométrico de alta intensidade que trabalha potência, coordenação e força explosiva dos membros inferiores.",
    tips: [
      "Mantenha o tronco ereto e o core ativado para garantir o equilíbrio.",
      "A aterrissagem deve ser silenciosa e controlada para proteger as articulações.",
      "Use os braços para auxiliar no impulso e na coordenação do salto.",
    ],
    precautions: [
      "Contraindicado para lesões agudas de LCA, meniscos ou instabilidades severas de tornozelo.",
      "Evite se houver dor patelofemoral aguda.",
      "Não recomendado para pacientes com alto risco de quedas.",
    ],
    benefits: [
      "Ganho de potência muscular e força explosiva.",
      "Melhora do condicionamento cardiovascular.",
      "Aumento da estabilidade dinâmica do quadril e joelho.",
      "Desenvolvimento de coordenação motora avançada.",
    ],
  },
  {
    slug: "alongamento-tensor-fascia-lata",
    instructions:
      "### Guia Passo a Passo: Alongamento do Tensor da Fáscia Lata (TFL)\n\n1.  **Posicionamento**: Em pé, cruze a perna que deseja alongar atrás da perna de apoio.\n2.  **Apoio**: Se necessário, apoie a mão do lado oposto ao alongamento em uma parede para equilíbrio.\n3.  **Execução**: Incline o tronco para o lado da perna de apoio (lado oposto ao alongamento), ao mesmo tempo em que empurra o quadril lateralmente para fora.\n4.  **Manutenção**: Sinta o alongamento no lado externo do quadril e coxa. Mantenha por 30 segundos.\n5.  **Retorno**: Volte lentamente à posição inicial e repita do outro lado.",
    description:
      "Foca no músculo tensor da fáscia lata e na banda iliotibial (BIT), essencial para corredores e ciclistas.",
    tips: [
      "A perna de trás deve estar com o pé bem apoiado para maximizar o alongamento.",
      "Mantenha a pelve alinhada para frente, evitando rotações excessivas.",
      "A inclinação lateral do tronco deve ser controlada e sem dor.",
    ],
    precautions: [
      "Cuidado se houver bursite trocantérica ativa.",
      "Evite se sentir dor aguda no joelho lateral durante o movimento.",
    ],
    benefits: [
      "Redução da tensão na banda iliotibial.",
      "Melhora da mobilidade lateral do quadril.",
      "Prevenção da síndrome da banda iliotibial.",
      "Alívio de dores glúteas associadas ao encurtamento do TFL.",
    ],
  },
  {
    slug: "bicep-curl-alternado",
    instructions:
      "### Guia Passo a Passo: Rosca Bíceps Alternada\n\n1.  **Posição Inicial**: Em pé, com os pés na largura dos ombros, segurando um halter em cada mão com os braços estendidos ao lado do corpo.\n2.  **Execução**: Flexione um cotovelo, trazendo o peso em direção ao ombro, girando a palma da mão para cima (supinação) durante o movimento.\n3.  **Descida**: Retorne o peso de forma controlada até a extensão total do braço.\n4.  **Alternância**: Repita o movimento com o outro braço, mantendo o tronco estável.",
    description:
      "Exercício clássico de fortalecimento do bíceps braquial e braquial, realizado com halteres para permitir trabalho unilateral.",
    tips: [
      "Mantenha os cotovelos fixos ao lado do tronco; não os mova para frente ou para trás.",
      "Evite usar o balanço do corpo para subir o peso.",
      "Controle a fase de descida (excêntrica) para maior recrutamento muscular.",
    ],
    precautions: [
      "Mantenha a coluna neutra e evite hiperestender a lombar.",
      "Evite se houver dor aguda no cotovelo ou punho.",
    ],
    benefits: [
      "Fortalecimento isolado do bíceps braquial.",
      "Melhora da força de flexão do cotovelo necessária para AVDs.",
      "Permite corrigir assimetrias de força entre os braços.",
    ],
  },
  {
    slug: "bicep-curl-martelo",
    instructions:
      "### Guia Passo a Passo: Rosca Martelo\n\n1.  **Posição Inicial**: Em pé, segurando halteres com as palmas das mãos voltadas para as coxas (pegada neutra).\n2.  **Execução**: Flexione os cotovelos levando os halteres em direção aos ombros, mantendo a pegada neutra (palmas voltadas uma para a outra) durante todo o movimento.\n3.  **Manutenção**: Contraia o bíceps no topo do movimento por um segundo.\n4.  **Retorno**: Desça os pesos lentamente até a posição inicial.",
    description:
      "Variação da rosca bíceps que enfatiza o músculo braquiorradial (antebraço) e o braquial, além do bíceps.",
    tips: [
      "Mantenha os ombros relaxados e o peito aberto.",
      "A pegada neutra deve ser mantida com firmeza para trabalhar os músculos do antebraço.",
      "Não encoste os pesos nos ombros.",
    ],
    precautions: [
      "Cuidado em casos de epicondilite lateral ativa.",
      "Mantenha o punho em posição neutra (sem flexão ou extensão excessiva).",
    ],
    benefits: [
      "Desenvolvimento da força do antebraço e braquiorradial.",
      "Fortalecimento do braquial, aumentando o volume do braço.",
      "Melhora da estabilidade do punho durante movimentos de carga.",
    ],
  },
  {
    slug: "barra-fixa-supinada",
    instructions:
      "### Guia Passo a Passo: Barra Fixa Supinada (Chin-Up)\n\n1.  **Posicionamento**: Segure na barra com as palmas das mãos voltadas para você (supinadas), na largura dos ombros.\n2.  **Preparação**: Pendure-se livremente, com os braços totalmente estendidos e o core ativado.\n3.  **A Tração**: Puxe o corpo para cima, levando o peito em direção à barra e os cotovelos para baixo, até que o queixo ultrapasse o nível da barra.\n4.  **Controle**: Mantenha a contração no topo por um breve instante.\n5.  **Descida**: Retorne lentamente à posição inicial sob controle total.",
    description:
      "Exercício de tração superior multiarticular que recruta fortemente os bíceps e os grandes dorsais.",
    tips: [
      "Inicie o movimento puxando as escápulas para baixo e para trás antes de flexionar os cotovelos.",
      "Evite chutar com as pernas (kipping) para garantir o trabalho muscular puro.",
      "Foque em manter os ombros longe das orelhas.",
    ],
    precautions: [
      "Evite em casos de instabilidade de ombro ou dor severa no cotovelo (golfista).",
      "Fisioterapeutas devem auxiliar o paciente em caso de fraqueza excessiva para prevenir lesões nos tendões do manguito.",
    ],
    benefits: [
      "Fortalecimento intenso de bíceps braquial e latíssimo do dorso.",
      "Aumento da força de preensão manual.",
      "Melhora da estabilidade escapular.",
    ],
  },
  {
    slug: "avanco-isometrico",
    instructions:
      "### Guia Passo a Passo: Avanço Isométrico\n\n1.  **Posição Inicial**: Dê um passo largo para frente e flexione os joelhos até que o joelho de trás esteja a poucos centímetros do chão.\n2.  **Alinhamento**: Garanta que o joelho da frente esteja alinhado com o tornozelo e o tronco permaneça vertical.\n3.  **Sustentação**: Mantenha essa posição estática pelo tempo recomendado (ex: 20-40 segundos), mantendo a contração constante.\n4.  **Troca**: Retorne à posição em pé e repita com a outra perna à frente.",
    description:
      "Exercício de resistência estática para membros inferiores, focado em estabilidade e força isométrica de quadríceps e glúteos.",
    tips: [
      "Mantenha o abdômen contraído para estabilizar o tronco.",
      "Distribua o peso igualmente entre as duas pernas.",
      "Não deixe o joelho da frente desabar para dentro (valgo).",
    ],
    precautions: [
      "Evite se houver dor patelofemoral aguda.",
      "Cuidado com o equilíbrio; se necessário, use um ponto de apoio lateral.",
    ],
    benefits: [
      "Aumento da resistência muscular local.",
      "Melhora da estabilidade do joelho e quadril.",
      "Baixo impacto articular comparado ao avanço dinâmico.",
    ],
  },
  {
    slug: "equilibrio-unipodal-solo",
    instructions:
      "### Guia Passo a Passo: Equilíbrio Unipodal Solo\n\n1.  **Posição Inicial**: Fique em pé em uma superfície plana e firme (chão).\n2.  **Execução**: Eleve uma das pernas, mantendo-se apoiado apenas em um pé. Tente não encostar a perna elevada na perna de apoio.\n3.  **Estabilização**: Procure um ponto fixo à frente para ajudar no equilíbrio. Mantenha os braços ao lado do corpo ou estendidos se precisar de mais auxílio.\n4.  **Duração**: Sustente a posição por 30 a 60 segundos.",
    description:
      "Exercício fundamental de propriocepção e equilíbrio, essencial para a reabilitação de tornozelo, joelho e quadril.",
    tips: [
      "Mantenha o joelho da perna de apoio levemente 'destravado' (sem hiperextensão).",
      "Tente manter o alinhamento da pelve nivelado.",
      "Para aumentar a dificuldade, tente realizar com os olhos fechados.",
    ],
    precautions: [
      "Certifique-se de estar próximo a uma parede ou objeto estável para segurança caso perca o equilíbrio.",
      "Evite se houver instabilidade severa de tornozelo sem supervisão.",
    ],
    benefits: [
      "Melhora do equilíbrio estático.",
      "Aumento da estabilidade proprioceptiva do tornozelo.",
      "Fortalecimento dos pequenos músculos estabilizadores do pé e quadril.",
    ],
  },
  {
    slug: "ankle-inversion-isometric",
    instructions:
      "### Guia Passo a Passo: Isometria de Inversão de Tornozelo\n\n1.  **Posicionamento**: Sentado em uma cadeira ou no chão com as pernas estendidas. Posicione o pé de modo que a parte interna (borda medial) esteja encostada em uma superfície fixa (ex: pé de uma mesa ou o outro pé).\n2.  **Execução**: Pressione a borda interna do pé contra o objeto fixo, tentando girar o pé para dentro, mas sem realizar o movimento (contração isométrica).\n3.  **Sustentação**: Mantenha a pressão máxima confortável por 5 a 10 segundos.\n4.  **Repetição**: Relaxe por alguns segundos e repita conforme orientado.",
    description:
      "Fortalecimento isométrica para os músculos inversores do tornozelo (tibial posterior), crucial para a estabilidade do arco plantar.",
    tips: [
      "Não mova o tronco ou a perna para compensar a força.",
      "Mantenha a respiração normal durante a contração (não prenda o fôlego).",
      "Foque na ativação muscular na parte interna da perna.",
    ],
    precautions: [
      "Cuidado em fases muito precoces de entorses de tornozelo.",
      "A intensidade da força deve ser progressiva e indolor.",
    ],
    benefits: [
      "Fortalecimento do músculo tibial posterior.",
      "Aumento da estabilidade articular do tornozelo.",
      "Melhora do suporte do arco plantar longitudinal medial.",
    ],
  },
];

async function updateExercises() {
  const sql = neon(DATABASE_URL);
  try {
    console.log(`🚀 Iniciando enriquecimento de ${enrichmentData.length} exercícios (Batch 1)...`);

    for (const ex of enrichmentData) {
      const res = await sql`
        UPDATE exercises 
        SET 
          instructions = ${ex.instructions},
          description = ${ex.description},
          tips = ${ex.tips},
          precautions = ${ex.precautions},
          benefits = ${ex.benefits},
          updated_at = NOW()
        WHERE slug = ${ex.slug}
        RETURNING name
      `;

      if (res.length > 0) {
        console.log(`✅ Sucesso: ${res[0].name} (${ex.slug})`);
      } else {
        console.warn(`⚠️ Aviso: Exercício não encontrado para o slug ${ex.slug}`);
      }
    }

    console.log("✨ Batch 1 concluído com sucesso!");
  } catch (err) {
    console.error("❌ Erro durante o enriquecimento:", err);
  }
}

updateExercises();
