import { neon } from "@neondatabase/serverless";

const DATABASE_URL =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";

const enrichmentData = [
  {
    slug: "circulos-de-quadril",
    instructions:
      "### Guia Passo a Passo: Círculos de Quadril\n\n1.  **Posição Inicial**: Em pé, com os pés na largura dos ombros e as mãos apoiadas na cintura.\n2.  **Execução**: Realize movimentos circulares lentos e amplos com o quadril, como se estivesse usando um bambolê imaginário.\n3.  **Amplitude**: Tente alcançar a maior amplitude possível em cada direção (frente, lado, trás, lado).\n4.  **Troca de Sentido**: Após completar as repetições em um sentido, inverta a direção do movimento.\n5.  **Controle**: Mantenha o tronco relativamente estável e foque a mobilidade na articulação do quadril.",
    description:
      "Exercício de mobilidade articular para o complexo do quadril e coluna lombar baixa, excelente para aquecimento ou alívio de rigidez.",
    tips: [
      "Mantenha os joelhos levemente relaxados, não bloqueados.",
      "Respire de forma contínua, sincronizando com o movimento circular.",
      "Não force amplitudes que causem dor ou desconforto.",
    ],
    precautions: [
      "Cuidado em casos de bursite trocantérica aguda ou impacto fêmoro-acetabular (IFA) sintomático.",
      "Evite se houver dor aguda na região lombar.",
    ],
    benefits: [
      "Melhora da mobilidade da articulação coxofemoral.",
      "Lubrificação articular.",
      "Redução da rigidez na transição lombo-sacra.",
      "Aquecimento dinâmico para treinos de membros inferiores.",
    ],
  },
  {
    slug: "elevacao-calcanhares",
    instructions:
      "### Guia Passo a Passo: Elevação de Calcanhares (Panturrilha)\n\n1.  **Posição Inicial**: Em pé, com os pés paralelos e na largura dos quadris. Você pode apoiar as mãos em uma parede ou cadeira para equilíbrio.\n2.  **Execução**: Eleve-se sobre as pontas dos pés, levantando os calcanhares o máximo que puder, concentrando o peso sobre o hálux (dedão) e o segundo dedo.\n3.  **Pico**: Mantenha a posição máxima por um segundo, sentindo a contração na panturrilha.\n4.  **Descida**: Retorne os calcanhares ao solo de forma lenta e controlada.\n5.  **Repetição**: Repita o movimento conforme a prescrição.",
    description:
      "Fortalecimento clássico para os músculos da panturrilha (gastrocnêmios e sóleo), fundamental para a propulsão na marcha e estabilidade do tornozelo.",
    tips: [
      "Evite que os tornozelos caiam para fora durante a subida (mantenha o alinhamento neutro).",
      "A descida controlada é tão importante quanto a subida para o ganho de força.",
      "Tente manter o tronco ereto, sem inclinar para frente.",
    ],
    precautions: [
      "Evite se houver tendinite de Aquiles em fase inflamatória aguda.",
      "Cuidado em casos de instabilidade severa de tornozelo (use sempre apoio).",
    ],
    benefits: [
      "Fortalecimento do tríceps sural.",
      "Melhora do equilíbrio e estabilidade do tornozelo.",
      "Aumento da potência de salto e eficiência na corrida.",
      "Auxílio no retorno venoso dos membros inferiores.",
    ],
  },
  {
    slug: "agachamento-na-cadeira",
    instructions:
      "### Guia Passo a Passo: Agachamento na Cadeira (Sit-to-Stand)\n\n1.  **Posição Inicial**: Fique em pé, de costas para uma cadeira estável, com os pés na largura dos ombros.\n2.  **Descida**: Inicie o movimento projetando o quadril para trás, como se fosse sentar, flexionando joelhos e quadris simultaneamente.\n3.  **Toque**: Desça até que seus glúteos toquem levemente o assento da cadeira (sem descarregar todo o peso se possível).\n4.  **Subida**: Empurre o chão com os calcanhares e retorne à posição em pé, estendendo totalmente os quadris.\n5.  **Braços**: Pode manter os braços estendidos à frente para auxiliar no equilíbrio.",
    description:
      "Exercício funcional essencial que mimetiza um dos movimentos mais realizados no dia a dia, trabalhando quadríceps e glúteos.",
    tips: [
      "Não permita que os joelhos ultrapassem excessivamente a linha dos dedos dos pés.",
      "Mantenha o peito aberto e o olhar para frente.",
      "Os joelhos devem seguir a direção da ponta dos pés durante todo o trajeto.",
    ],
    precautions: [
      "Certifique-se de que a cadeira esteja encostada em uma parede ou seja muito estável.",
      "Evite se houver dor fêmoro-patelar aguda.",
    ],
    benefits: [
      "Independência funcional para sentar e levantar.",
      "Fortalecimento global de membros inferiores.",
      "Melhora da coordenação motora e equilíbrio dinâmico.",
    ],
  },
  {
    slug: "alongamento-triceps-sentado",
    instructions:
      "### Guia Passo a Passo: Alongamento de Tríceps Sentado\n\n1.  **Posicionamento**: Sente-se ereto em uma cadeira.\n2.  **Preparação**: Eleve um braço em direção ao teto e dobre o cotovelo, levando a palma da mão em direção à parte superior das costas.\n3.  **Execução**: Com a outra mão, segure o cotovelo elevado e empurre-o suavemente para baixo e para trás.\n4.  **Manutenção**: Sinta o alongamento na parte de trás do braço (tríceps). Segure por 20 a 30 segundos.\n5.  **Relaxamento**: Solte suavemente e repita com o outro braço.",
    description:
      "Alongamento eficaz para a musculatura extensora do cotovelo, útil para melhorar a flexão do ombro.",
    tips: [
      "Mantenha a cabeça erguida, sem empurrar o queixo contra o peito.",
      "Mantenha a coluna lombar apoiada no encosto da cadeira para evitar compensações.",
      "Respire pausadamente durante a manutenção da posição.",
    ],
    precautions: [
      "Cuidado se houver síndrome do impacto do ombro ou lesões no manguito rotador.",
      "Evite forçar se houver dor aguda no cotovelo.",
    ],
    benefits: [
      "Melhora da flexibilidade do tríceps braquial.",
      "Aumento da amplitude de movimento de flexão do ombro.",
      "Redução da tensão muscular após treinos de membros superiores.",
    ],
  },
  {
    slug: "avanco-com-halteres",
    instructions:
      "### Guia Passo a Passo: Avanço com Halteres (Lunges)\n\n1.  **Posição Inicial**: Em pé, segurando um halter em cada mão ao lado do corpo, tronco ereto.\n2.  **O Passo**: Dê um passo largo para frente com uma perna.\n3.  **Descida**: Flexione ambos os joelhos simultaneamente até que o joelho de trás esteja próximo ao solo e o da frente forme um ângulo de 90 graus.\n4.  **Subida**: Empurre o solo com o pé da frente e retorne à posição inicial de pé.\n5.  **Coordenação**: Mantenha o equilíbrio e repita trocando a perna ou alternando.",
    description:
      "Exercício dinâmico e funcional para fortalecimento de quadríceps, glúteos e isquiotibiais, com desafio adicional de equilíbrio.",
    tips: [
      "Mantenha o tronco vertical; evite inclinar excessivamente para frente.",
      "O joelho da frente deve estar alinhado com o segundo dedo do pé.",
      "Mantenha o core ativado para evitar oscilações laterais do tronco.",
    ],
    precautions: [
      "Evite se houver dor aguda no joelho ou instabilidade de tornozelo.",
      "Cuidado para não bater o joelho de trás com força no chão.",
    ],
    benefits: [
      "Fortalecimento potente de membros inferiores.",
      "Melhora do equilíbrio e estabilidade lombo-pélvica.",
      "Desenvolvimento de força funcional unilateral.",
    ],
  },
  {
    slug: "fortalecimento-intrinsecos-pe",
    instructions:
      "### Guia Passo a Passo: Fortalecimento de Intrínsecos do Pé (Toalha)\n\n1.  **Posicionamento**: Sente-se em uma cadeira com os pés descalços apoiados sobre uma toalha estendida no chão liso.\n2.  **Execução**: Use apenas os dedos dos pés para 'puxar' a toalha em sua direção, enrugando-a sob o arco do pé.\n3.  **Finalização**: Após encolher toda a toalha, use os dedos para estendê-la novamente ou simplesmente a reinicie manualmente.\n4.  **Volume**: Repita o processo de 3 a 5 vezes por pé.",
    description:
      "Exercício clássico para fortalecer os pequenos músculos internos do pé, fundamentais para a saúde do arco plantar.",
    tips: [
      "Mantenha o calcanhar apoiado no chão durante todo o movimento.",
      "Tente isolar o movimento nos dedos, sem girar o tornozelo.",
      "Aumente a dificuldade colocando um pequeno peso na extremidade oposta da toalha.",
    ],
    precautions: [
      "Evite se houver fascite plantar em fase hiperaguda ou feridas na planta do pé.",
      "Cuidado em casos de neuropatias severas com perda de sensibilidade.",
    ],
    benefits: [
      "Fortalecimento do arco plantar longitudinal.",
      "Melhora do equilíbrio e base de apoio.",
      "Prevenção de patologias como hálux valgo (joanete) e dedos em garra.",
      "Essencial na reabilitação de entorses e fascites.",
    ],
  },
  {
    slug: "hollow-rock-canoa",
    instructions:
      "### Guia Passo a Passo: Hollow Rock (Canoa)\n\n1.  **Posição Inicial**: Deite-se de costas no chão com braços estendidos acima da cabeça e pernas estendidas.\n2.  **Posição de Canoa**: Retire simultaneamente as pernas e a parte superior das costas do chão, mantendo apenas a região lombar apoiada. Suas mãos e pés devem ficar a cerca de 15-30cm do solo.\n3.  **Ativação**: Pressione a lombar contra o solo vigorosamente através da contração abdominal profunda.\n4.  **Balanço**: Inicie um pequeno balanço para frente e para trás, mantendo todo o corpo rígido como uma canoa.\n5.  **Manutenção**: Não permita que a lombar perca o contato com o chão em nenhum momento.",
    description:
      "Exercício avançado de estabilização do core que exige extrema força abdominal e controle corporal.",
    tips: [
      "Se a lombar sair do chão, flexione levemente os joelhos ou traga os braços para o lado do corpo para facilitar.",
      "Minimize o tamanho do balanço e foque na tensão constante do abdômen.",
      "Respire de forma curta e controlada.",
    ],
    precautions: [
      "Contraindicado para pacientes com hérnias discais lombares sintomáticas ou diástase severa.",
      "Evite se houver dor aguda na lombar durante a execução.",
    ],
    benefits: [
      "Fortalecimento excepcional do reto abdominal e oblíquos.",
      "Melhora da estabilidade intrínseca da coluna.",
      "Desenvolvimento de controle corporal coordenado.",
    ],
  },
  {
    slug: "agachamento-goblet",
    instructions:
      "### Guia Passo a Passo: Agachamento Goblet\n\n1.  **Posicionamento**: Em pé, segure um halter ou kettlebell junto ao peito com ambas as mãos, mantendo os cotovelos apontados para baixo.\n2.  **Descida**: Agache projetando o quadril para trás e para baixo, mantendo o peso próximo ao corpo. Desça até que os cotovelos toquem a parte interna dos joelhos ou o máximo que conseguir sem perder a postura.\n3.  **Pico**: Faça uma pausa curta no fundo do agachamento.\n4.  **Subida**: Empurre o chão com os calcanhares e retorne à posição inicial, estendendo os quadris.\n5.  **Coluna**: Mantenha a coluna neutra e o peito bem aberto durante todo o exercício.",
    description:
      "Variação de agachamento com carga frontal que facilita a manutenção da postura ereta e o alcance de profundidade.",
    tips: [
      "Use o peso como um contrapeso para ajudar a descer mais com a coluna reta.",
      "Mantenha os calcanhares sempre firmes no chão.",
      "Expire na subida e inspire na descida.",
    ],
    precautions: [
      "Cuidado se houver dor lombar aguda ou lesão meniscal.",
      "Não deixe os joelhos 'entrarem' (valgo) durante o esforço.",
    ],
    benefits: [
      "Fortalecimento global de quadríceps e glúteos.",
      "Melhora da mobilidade de quadril e tornozelo.",
      "Aumento da estabilidade do core devido à carga frontal.",
    ],
  },
  {
    slug: "alongamento-triceps-com-toalha",
    instructions:
      "### Guia Passo a Passo: Alongamento de Tríceps com Toalha\n\n1.  **Posicionamento**: Em pé, segure uma ponta de uma toalha pequena com a mão do braço que deseja alongar.\n2.  **Preparação**: Eleve esse braço e dobre o cotovelo, deixando a toalha cair pelas costas.\n3.  **Execução**: Com a outra mão (por baixo, na altura da lombar), segure a outra ponta da toalha.\n4.  **Alongamento**: Puxe suavemente a toalha com a mão de baixo, fazendo com que o braço de cima alongue o tríceps.\n5.  **Manutenção**: Segure por 30 segundos, sentindo a tensão confortável.",
    description:
      "Maneira assistida e controlada de alongar o tríceps e melhorar a rotação dos ombros.",
    tips: [
      "Tente manter a coluna alinhada, sem projetar a cabeça para frente.",
      "A tração deve ser constante e suave, nunca brusca.",
      "Pode servir também para alongar a rotação interna do braço de baixo simultaneamente.",
    ],
    precautions: [
      "Evite se houver lesões agudas no manguito rotador ou capsulite adesiva severa.",
      "Pare se sentir dores agudas ou choque no ombro.",
    ],
    benefits: [
      "Melhora da flexibilidade do tríceps e mobilidade complexa do ombro.",
      "Útil para ganhar amplitude necessária para atividades funcionais como vestir-se.",
    ],
  },
  {
    slug: "avanco-reverso-halteres",
    instructions:
      "### Guia Passo a Passo: Avanço Reverso com Halteres\n\n1.  **Posição Inicial**: Em pé, segurando halteres ao lado do corpo.\n2.  **O Passo**: Dê um passo largo para trás com uma das pernas.\n3.  **Descida**: Flexione ambos os joelhos simultaneamente até o joelho de trás quase tocar o solo. O joelho da frente deve formar um ângulo de 90 graus.\n4.  **Subida**: Empurre o chão com o pé da frente, retornando à posição inicial.\n5.  **Repetição**: Alterne as pernas ou complete todas as repetições de um lado primeiro.",
    description:
      "Variação de avanço que tende a ser mais gentil com os joelhos (menos impacto patelofemoral) e enfatiza a cadeia posterior.",
    tips: [
      "Mantenha o peso concentrado no calcanhar da perna da frente.",
      "O tronco pode inclinar-se levemente para frente para maior recrutamento de glúteo máximo.",
      "Mantenha o equilíbrio olhando para um ponto fixo.",
    ],
    precautions: [
      "Cuidado com o equilíbrio; se necessário, realize sem pesos primeiro.",
      "Mantenha o joelho da frente alinhado para evitar estresse ligamentar.",
    ],
    benefits: [
      "Fortalecimento de glúteos, isquiotibiais e quadríceps.",
      "Melhora do equilíbrio dinâmico e estabilidade unipodal.",
      "Menor estresse na articulação do joelho comparado ao avanço frontal.",
    ],
  },
  {
    slug: "rdl-romanian-deadlift",
    instructions:
      "### Guia Passo a Passo: RDL (Romanian Deadlift)\n\n1.  **Posicionamento**: Em pé, pés na largura do quadril, segurando halteres ou barra à frente das coxas.\n2.  **Descida**: Com os joelhos levemente flexionados ('destravados'), inicie a descida projetando o quadril para trás, mantendo a coluna neutra e a carga próxima às pernas.\n3.  **Limite**: Desça até sentir um alongamento potente nos isquiotibiais (geralmente até um pouco abaixo dos joelhos) sem arredondar a coluna.\n4.  **Subida**: Contraia os glúteos e isquiotibiais para retornar à posição ereta, 'fechando' o quadril no topo.\n5.  **Respiração**: Inspire na descida e expire na subida.",
    description:
      "Exercício fundamental da dobradiça de quadril (hip hinge) para fortalecimento de toda a cadeia posterior (ísquios e glúteos).",
    tips: [
      "A chave do exercício é o movimento do quadril para trás, não o tronco para baixo.",
      "Mantenha as escápulas 'encaixadas' e o peito aberto.",
      "Não tente tocar o chão se isso fizer você perder o alinhamento lombar.",
    ],
    precautions: [
      "Cuidado se houver dor lombar discogênica ou instabilidade vertebral.",
      "Não realize com cargas altas se não dominar a técnica de manter a coluna neutra.",
    ],
    benefits: [
      "Fortalecimento potente de isquiotibiais e glúteo máximo.",
      "Melhora da postura e estabilidade da coluna lombar.",
      "Aumento da flexibilidade dinâmica da cadeia posterior.",
    ],
  },
  {
    slug: "remada-sentada-com-faixa",
    instructions:
      "### Guia Passo a Passo: Remada Sentada com Faixa Elástica\n\n1.  **Posicionamento**: Sente-se no chão com as pernas estendidas à frente. Envolva a faixa elástica ao redor da sola dos pés.\n2.  **Apoio**: Segure as extremidades da faixa com as mãos, braços estendidos, coluna bem ereta.\n3.  **Execução**: Puxe a faixa em direção ao abdômen, levando os cotovelos para trás e 'espremendo' as escápulas uma contra a outra.\n4.  **Retorno**: Estenda os braços novamente de forma controlada, sentindo a resistência da faixa.\n5.  **Tronco**: Mantenha o corpo imóvel; não balance para frente e para trás para auxiliar o movimento.",
    description:
      "Excelente exercício de tração horizontal para fortalecer os músculos das costas e melhorar a postura dos ombros.",
    tips: [
      "Concentre-se em iniciar o movimento pelas escápulas, não apenas pelos braços.",
      "Mantenha os ombros baixos, longe das orelhas.",
      "Pode-se flexionar levemente os joelhos se sentir desconforto na lombar ou ísquios.",
    ],
    precautions: [
      "Certifique-se de que a faixa esteja bem presa aos pés para evitar que escape.",
      "Evite se houver dor aguda no ombro em fase inflamatória.",
    ],
    benefits: [
      "Fortalecimento de romboides, trapézio médio/inferior e latíssimo do dorso.",
      "Correção de postura com ombros projetados para frente (protusão).",
      "Auxílio na estabilização escapular.",
    ],
  },
];

async function updateExercises() {
  const sql = neon(DATABASE_URL);
  try {
    console.log(`🚀 Iniciando enriquecimento de ${enrichmentData.length} exercícios (Batch 2)...`);

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

    console.log("✨ Batch 2 concluído com sucesso!");
  } catch (err) {
    console.error("❌ Erro durante o enriquecimento:", err);
  }
}

updateExercises();
