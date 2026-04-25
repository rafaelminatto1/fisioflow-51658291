export type BiomechanicsEvidenceMode = "jump" | "gait" | "posture" | "functional";

export interface BiomechanicsEvidenceArticle {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  url: string;
  doi?: string;
  summary: string;
  clinicalTakeaway: string;
  group: "Esportiva" | "Ortopedia";
  subgroup: string;
  evidence: "SystematicReview" | "Guideline" | "Consensus";
  tags: string[];
}

export interface BiomechanicsProtocolDefinition {
  mode: BiomechanicsEvidenceMode;
  title: string;
  subtitle: string;
  description: string;
  keyPoints: string[];
  preparationChecklist: string[];
  captureAngles: string[];
  executionSteps: string[];
  measuredOutputs: string[];
  guidedTemplates: Array<{
    id: string;
    title: string;
    goal: string;
    capturePreset: string;
    idealFor: string;
    checklist: string[];
    reportFocus: string[];
    clinicalQuestions: string[];
  }>;
  articles: BiomechanicsEvidenceArticle[];
}

export const biomechanicsProtocols: Record<
  BiomechanicsEvidenceMode,
  BiomechanicsProtocolDefinition
> = {
  jump: {
    mode: "jump",
    title: "Salto vertical e potência",
    subtitle: "CMJ / My Jump / Bosco",
    description:
      "Fluxo voltado para countermovement jump, tempo de voo, altura estimada, potência e comparação entre tentativas.",
    keyPoints: [
      "Frame a frame para decolagem e aterrissagem",
      "Comparação entre tentativas e snapshots-chave",
      "IA opcional para landmarks e trajetórias",
    ],
    preparationChecklist: [
      "Gravar em plano sagital com o celular estabilizado na altura do quadril.",
      "Manter corpo inteiro visível do agachamento até a aterrissagem.",
      "Registrar 2 a 3 tentativas com intervalo curto entre repetições.",
    ],
    captureAngles: [
      "Perfil lateral para tempo de voo, agachamento e aterrissagem.",
      "Frontal opcional para assimetria de joelho e tronco.",
    ],
    executionSteps: [
      "Importe o vídeo ou use a webcam.",
      "Marque decolagem e aterrissagem frame a frame.",
      "Ative IA apenas se quiser overlay assistido de landmarks.",
      "Compare snapshots-chave entre tentativas antes de exportar.",
    ],
    measuredOutputs: [
      "Tempo de voo",
      "Altura estimada do salto",
      "Potência estimada",
      "Snapshots de decolagem e aterrissagem",
    ],
    guidedTemplates: [
      {
        id: "jump-cmj-screening",
        title: "CMJ clínico rápido",
        goal: "Triagem rápida de potência e estratégia de aterrissagem.",
        capturePreset: "Lateral 240 fps, corpo inteiro, 3 tentativas.",
        idealFor: "retorno ao esporte, performance, avaliação basal",
        checklist: [
          "Marcar decolagem e aterrissagem em cada tentativa.",
          "Comparar o melhor salto com o mais consistente.",
        ],
        reportFocus: ["altura estimada", "tempo de voo", "consistência entre tentativas"],
        clinicalQuestions: [
          "Há perda de estratégia entre a 1ª e a 3ª tentativa?",
          "O pouso parece mais limitado do que a fase propulsiva?",
        ],
      },
      {
        id: "jump-landing-control",
        title: "Controle de aterrissagem",
        goal: "Observar absorção de impacto e assimetria no pouso.",
        capturePreset: "Frontal + lateral, 120-240 fps.",
        idealFor: "LCA, joelho, prevenção de recidiva",
        checklist: [
          "Salvar snapshot do primeiro contato.",
          "Registrar valgismo/controle de tronco no pouso.",
        ],
        reportFocus: ["controle de joelho", "tronco no pouso", "assimetria entre membros"],
        clinicalQuestions: [
          "O joelho entra em valgo no primeiro contato?",
          "O tronco compensa para descarregar um lado?",
        ],
      },
      {
        id: "jump-drop-jump-rsi",
        title: "Drop jump / RSI clínico",
        goal: "Observar reatividade, rigidez e estratégia no contato rápido.",
        capturePreset: "Lateral 240 fps com caixa baixa e contato visível.",
        idealFor: "tendão, performance, readaptação de salto",
        checklist: [
          "Marcar primeiro contato, pico de flexão e saída do solo.",
          "Comparar tempo de contato entre 2 a 3 tentativas.",
        ],
        reportFocus: ["tempo de contato", "reatividade", "rigidez aparente"],
        clinicalQuestions: [
          "O paciente demora para reutilizar a energia elástica?",
          "Existe proteção excessiva na fase excêntrica?",
        ],
      },
      {
        id: "jump-single-leg-hop",
        title: "Hop unipodal",
        goal: "Comparar potência, estabilidade e controle no membro inferior.",
        capturePreset: "Frontal + lateral, 120-240 fps.",
        idealFor: "LCA, tornozelo, retorno ao esporte",
        checklist: [
          "Registrar lado direito e esquerdo na mesma distância.",
          "Salvar snapshot do contato e da estabilização final.",
        ],
        reportFocus: ["diferença entre lados", "estabilidade final", "controle pélvico"],
        clinicalQuestions: [
          "Há diferença clara entre o lado operado e o contralateral?",
          "O paciente estabiliza rápido ou precisa de passos extras?",
        ],
      },
      {
        id: "jump-repeat-hop-fatigue",
        title: "Saltos repetidos e fadiga",
        goal: "Observar queda de desempenho e piora de controle em sequência curta.",
        capturePreset: "Lateral 120-240 fps com 4 a 6 saltos contínuos.",
        idealFor: "retorno gradual ao esporte, tendão, monitoramento de carga",
        checklist: [
          "Marcar primeiro e último salto da série.",
          "Comparar contato, altura e postura de tronco.",
        ],
        reportFocus: ["queda de altura", "tempo de contato final", "qualidade do pouso sob fadiga"],
        clinicalQuestions: [
          "O desempenho cai rápido ao longo da série?",
          "A fadiga aumenta rigidez ou colapso no pouso?",
        ],
      },
    ],
    articles: [
      {
        id: "cmj-portable-devices-2018",
        title:
          "Countermovement Jump Analysis Using Different Portable Devices: Implications for Field Testing",
        authors: "Pérez-Castilla A, et al.",
        year: 2018,
        journal: "Sports",
        doi: "10.3390/sports6030091",
        url: "https://doi.org/10.3390/sports6030091",
        summary:
          "Compara diferentes dispositivos portáteis para análise de CMJ em contexto de campo.",
        clinicalTakeaway:
          "Ajuda a sustentar o uso clínico de medidas simples de salto fora do laboratório.",
        group: "Esportiva",
        subgroup: "Salto",
        evidence: "SystematicReview",
        tags: ["cmj", "my jump", "salto vertical", "potencia"],
      },
      {
        id: "my-jump-review-2019",
        title:
          "Using Smartphones for Jump Diagnostics: A Brief Review of the Validity and Reliability of the My Jump App",
        authors: "Balsalobre-Fernández C, et al.",
        year: 2019,
        journal: "Strength and Conditioning Journal",
        doi: "10.1519/SSC.0000000000000472",
        url: "https://doi.org/10.1519/SSC.0000000000000472",
        summary:
          "Revisão breve sobre validade e confiabilidade do app My Jump para diagnóstico de salto.",
        clinicalTakeaway:
          "Reforça que vídeo e smartphone podem ser suficientes para análise prática de salto.",
        group: "Esportiva",
        subgroup: "Salto",
        evidence: "SystematicReview",
        tags: ["my jump", "salto", "video analysis"],
      },
      {
        id: "my-jump-2-validity-2024",
        title:
          "Validity and reliability of My Jump 2 app for measuring countermovement jump in recreational runners",
        authors: "Montalvo S, et al.",
        year: 2024,
        journal: "PeerJ",
        doi: "10.7717/peerj.17387",
        url: "https://doi.org/10.7717/peerj.17387",
        summary: "Valida o My Jump 2 para medir countermovement jump em corredores recreacionais.",
        clinicalTakeaway:
          "Fortalece o uso de análise por vídeo como ferramenta prática em clínica esportiva.",
        group: "Esportiva",
        subgroup: "Salto",
        evidence: "SystematicReview",
        tags: ["my jump 2", "cmj", "corredor"],
      },
    ],
  },
  gait: {
    mode: "gait",
    title: "Marcha e corrida em esteira",
    subtitle: "2D video running analysis",
    description:
      "Fluxo para análise clínica de marcha e corrida em esteira com eventos, cadência, contato e comparação entre vídeos.",
    keyPoints: [
      "Frame a frame para contato inicial e toe-off",
      "Corrida em esteira com vista sagital e frontal",
      "Comparação lado a lado e export de snapshots",
    ],
    preparationChecklist: [
      "Gravar 10 a 20 segundos contínuos em esteira.",
      "Capturar pelo menos uma vista sagital e, se possível, uma frontal/posterior.",
      "Manter velocidade da esteira registrada antes da análise.",
    ],
    captureAngles: [
      "Vista sagital para contato inicial, meio apoio e toe-off.",
      "Vista frontal para alinhamento de joelho, pelve e tronco.",
    ],
    executionSteps: [
      "Importe o vídeo e avance frame a frame até os eventos-chave.",
      "Marque contato inicial e toe-off nos dois lados.",
      "Use trajetórias e snapshots para comparar ciclos consecutivos.",
      "Ative IA só quando precisar de referência de landmarks.",
    ],
    measuredOutputs: [
      "Eventos do ciclo de marcha/corrida",
      "Cadência observacional",
      "Assimetrias visuais de apoio",
      "Snapshots comparativos por ciclo",
    ],
    guidedTemplates: [
      {
        id: "gait-treadmill-screen",
        title: "Corrida em esteira 2D",
        goal: "Analisar contato inicial, toe-off e cadência.",
        capturePreset: "Sagital 120-240 fps por 10-20 segundos.",
        idealFor: "corredores recreacionais e retorno gradual",
        checklist: [
          "Marcar pelo menos 2 ciclos completos por lado.",
          "Registrar velocidade da esteira no relatório.",
        ],
        reportFocus: ["cadência", "contato inicial", "simetria entre ciclos"],
        clinicalQuestions: [
          "O contato inicial muda quando a velocidade sobe?",
          "O padrão se mantém de forma consistente por mais de um ciclo?",
        ],
      },
      {
        id: "gait-frontal-alignment",
        title: "Alinhamento frontal",
        goal: "Observar pelve, joelho e tronco durante apoio.",
        capturePreset: "Frontal/posterior 60-120 fps.",
        idealFor: "joelho, quadril, controle proximal",
        checklist: [
          "Salvar snapshots em meio apoio.",
          "Comparar lado direito e esquerdo no mesmo ciclo.",
        ],
        reportFocus: ["controle pélvico", "alinhamento de joelho", "inclinação do tronco"],
        clinicalQuestions: [
          "Existe queda pélvica ou inclinação lateral clara?",
          "O joelho cruza a linha média no apoio?",
        ],
      },
      {
        id: "gait-walk-clinical",
        title: "Marcha clínica básica",
        goal: "Documentar apoio, progressão e assimetrias em marcha habitual.",
        capturePreset: "Sagital 60-120 fps por 6-10 metros ou esteira leve.",
        idealFor: "ortopedia geral, pós-operatório, idosos",
        checklist: [
          "Marcar contato inicial e toe-off de ambos os lados.",
          "Registrar uso de órtese, dor e velocidade aproximada.",
        ],
        reportFocus: ["tempo de apoio", "progressão da marcha", "uso de compensações"],
        clinicalQuestions: [
          "O paciente encurta um dos apoios por dor?",
          "Há proteção de membro ou rigidez de tronco?",
        ],
      },
      {
        id: "gait-return-to-run",
        title: "Retorno gradual à corrida",
        goal: "Comparar técnica antes/depois de ajuste de carga ou calçado.",
        capturePreset: "Sagital + frontal em esteira, 10-15 segundos por condição.",
        idealFor: "retorno ao esporte, tendinopatia, overload running",
        checklist: [
          "Salvar um ciclo de referência por condição.",
          "Registrar condição testada: velocidade, calçado ou instrução.",
        ],
        reportFocus: ["diferença entre condições", "impacto da instrução", "resposta à velocidade"],
        clinicalQuestions: [
          "O ajuste testado melhora o padrão ou só muda a aparência?",
          "A técnica piora acima de certa velocidade?",
        ],
      },
      {
        id: "gait-walk-turn-transition",
        title: "Marcha com giro e transição",
        goal: "Observar controle em mudança de direção e retomada da passada.",
        capturePreset: "Plano frontal ou oblíquo com trecho de marcha + giro.",
        idealFor: "idosos, ortopedia geral, vestibular funcional",
        checklist: [
          "Registrar aproximação, giro e retomada.",
          "Salvar snapshot do momento de pivô.",
        ],
        reportFocus: ["controle no giro", "tempo de reorientação", "necessidade de passos extras"],
        clinicalQuestions: [
          "O giro quebra o ritmo da marcha de forma desproporcional?",
          "O paciente usa passos extras para recuperar estabilidade?",
        ],
      },
    ],
    articles: [
      {
        id: "morin-running-stiffness-2005",
        title: "A simple method for measuring stiffness during running",
        authors: "Morin JB, et al.",
        year: 2005,
        journal: "Journal of Applied Biomechanics",
        url: "https://pubmed.ncbi.nlm.nih.gov/16095411/",
        summary:
          "Descreve método simples para estimar stiffness e parâmetros temporais durante corrida.",
        clinicalTakeaway:
          "Serve de base para métricas temporais e interpretação clínica de corrida em esteira.",
        group: "Esportiva",
        subgroup: "Corrida",
        evidence: "Consensus",
        tags: ["corrida", "marcha", "stiffness", "esteira"],
      },
      {
        id: "2d-running-reliability-2018",
        title: "Reliability of Two-Dimensional Video-Based Running Gait Analysis",
        authors: "Reinking MF, et al.",
        year: 2018,
        journal: "International Journal of Sports Physical Therapy",
        url: "https://pubmed.ncbi.nlm.nih.gov/30038831/",
        summary:
          "Estuda confiabilidade inter e intraexaminador da análise 2D de corrida em esteira.",
        clinicalTakeaway:
          "Valida a proposta de usar vídeo 2D em clínica para corrida, especialmente com protocolo consistente.",
        group: "Esportiva",
        subgroup: "Corrida",
        evidence: "SystematicReview",
        tags: ["2d video", "running gait", "reliability", "treadmill"],
      },
    ],
  },
  posture: {
    mode: "posture",
    title: "Postura e escoliose",
    subtitle: "Fotogrametria e alinhamento",
    description:
      "Fluxo para postura estática, linhas de referência, goniometria visual e triagem de escoliose por imagem comum.",
    keyPoints: [
      "Linhas de prumo e goniometria visual",
      "Snapshots comparativos por vista",
      "Triagem orientada para encaminhamento",
    ],
    preparationChecklist: [
      "Fotografar paciente em posição ortostática com fundo limpo.",
      "Capturar vistas anterior, lateral e posterior.",
      "Usar referências anatômicas visíveis e iluminação uniforme.",
    ],
    captureAngles: [
      "Vista lateral para alinhamento cabeça-ombro-pelve.",
      "Vista posterior para assimetria escapular e escoliose visual.",
    ],
    executionSteps: [
      "Importe imagem ou vídeo curto de postura.",
      "Ative linha de prumo e goniometria conforme a necessidade.",
      "Salve snapshots das vistas relevantes para comparação futura.",
      "Registre observações de triagem e decisão clínica.",
    ],
    measuredOutputs: [
      "Ângulos visuais e alinhamentos posturais",
      "Snapshots por vista",
      "Observações de triagem",
      "Comparação antes x depois",
    ],
    guidedTemplates: [
      {
        id: "posture-sapo-screen",
        title: "Fotogrametria postural",
        goal: "Triagem de alinhamentos e assimetrias posturais.",
        capturePreset: "Anterior, lateral e posterior com paciente parado.",
        idealFor: "avaliação inicial e reavaliação comparativa",
        checklist: [
          "Usar linha de prumo na vista lateral.",
          "Salvar snapshots padronizados das 3 vistas.",
        ],
        reportFocus: ["assimetria entre vistas", "alinhamento global", "comparação futura"],
        clinicalQuestions: [
          "A principal alteração aparece na vista lateral ou posterior?",
          "As referências foram capturadas de forma padronizada para reavaliação?",
        ],
      },
      {
        id: "posture-adams-screen",
        title: "Triagem Adams/escoliose",
        goal: "Registrar sinais visuais que indiquem necessidade de encaminhamento.",
        capturePreset: "Posterior com inclinação anterior controlada.",
        idealFor: "triagem clínica e acompanhamento",
        checklist: [
          "Registrar assimetria torácica/lombar.",
          "Anotar se há necessidade de imagem complementar.",
        ],
        reportFocus: ["assimetria no tronco", "necessidade de encaminhamento", "evolução visual"],
        clinicalQuestions: [
          "A assimetria justifica encaminhamento para imagem?",
          "Há progressão visual em relação ao registro anterior?",
        ],
      },
      {
        id: "posture-neck-shoulder",
        title: "Cabeça e cintura escapular",
        goal: "Observar anteriorização de cabeça, ombros e assimetria escapular.",
        capturePreset: "Anterior + lateral, iluminação uniforme.",
        idealFor: "dor cervical, ombro, trabalho em computador",
        checklist: [
          "Salvar vista lateral com linha de prumo.",
          "Comparar alturas de ombro e rotação escapular.",
        ],
        reportFocus: ["cabeça anteriorizada", "altura dos ombros", "escápula em repouso"],
        clinicalQuestions: [
          "O padrão combina com a queixa do paciente no trabalho?",
          "A alteração parece estrutural ou adaptativa?",
        ],
      },
      {
        id: "posture-before-after",
        title: "Antes x depois postural",
        goal: "Documentar evolução fotográfica padronizada entre sessões.",
        capturePreset: "Mesma distância, altura de câmera e marcações no solo.",
        idealFor: "reavaliação, adesão, educação do paciente",
        checklist: [
          "Repetir exatamente as 3 vistas da avaliação inicial.",
          "Registrar observações comparativas no relatório.",
        ],
        reportFocus: [
          "mudança perceptível",
          "manutenção do padrão de captura",
          "aderência visual ao tratamento",
        ],
        clinicalQuestions: [
          "A melhora observada é clinicamente relevante ou apenas fotográfica?",
          "A comparação foi feita em condições equivalentes?",
        ],
      },
      {
        id: "posture-wall-check",
        title: "Checagem rápida na parede",
        goal: "Usar referência vertical simples para educação do paciente e reavaliação rápida.",
        capturePreset: "Lateral com referência de parede e pés marcados.",
        idealFor: "educação postural, follow-up curto, ergonomia",
        checklist: [
          "Padronizar posição dos pés e distância da câmera.",
          "Salvar imagem com linha de prumo ativa.",
        ],
        reportFocus: ["relação cabeça-tronco", "consistência do padrão", "feedback visual"],
        clinicalQuestions: [
          "O paciente entende facilmente a referência visual?",
          "O padrão melhora com simples instrução postural?",
        ],
      },
    ],
    articles: [
      {
        id: "sapo-validation-2010",
        title: "Postural Assessment Software (PAS/SAPO): Validation and Reliability",
        authors: "Ferreira EAG, et al.",
        year: 2010,
        journal: "Clinics",
        doi: "10.1590/S1807-59322010000700005",
        url: "https://pubmed.ncbi.nlm.nih.gov/20668624/",
        summary:
          "Validação e confiabilidade do PAS/SAPO para mensuração angular e de distâncias corporais.",
        clinicalTakeaway:
          "Justifica o uso clínico de fotogrametria e medições por software em postura.",
        group: "Ortopedia",
        subgroup: "Postura",
        evidence: "SystematicReview",
        tags: ["postura", "sapo", "fotogrametria", "escoliose"],
      },
      {
        id: "adams-forward-bending-1999",
        title:
          "Is the forward-bending test an accurate diagnostic criterion for the screening of scoliosis?",
        authors: "Karachalios T, et al.",
        year: 1999,
        journal: "Spine",
        url: "https://pubmed.ncbi.nlm.nih.gov/10543034/",
        summary:
          "Avalia o valor diagnóstico do teste de Adams como critério de triagem para escoliose.",
        clinicalTakeaway:
          "Dá base para a triagem clínica de escoliose usando imagem comum e encaminhamento apropriado.",
        group: "Ortopedia",
        subgroup: "Postura",
        evidence: "Consensus",
        tags: ["adams", "escoliose", "triagem", "postura"],
      },
    ],
  },
  functional: {
    mode: "functional",
    title: "Gesto funcional e testes clínicos",
    subtitle: "Vídeo 2D + observação clínica",
    description:
      "Fluxo livre para agachamento, gesto esportivo, controle motor, mobilidade e testes funcionais capturados por vídeo.",
    keyPoints: [
      "Análise livre com ângulos e trajetórias",
      "Checkpoints e observações clínicas guiadas",
      "Comparação antes x depois",
    ],
    preparationChecklist: [
      "Escolher o teste funcional antes de iniciar a gravação.",
      "Posicionar câmera para manter o gesto completo visível.",
      "Registrar pelo menos uma repetição de referência e uma repetição alvo.",
    ],
    captureAngles: [
      "Plano principal do gesto com boa visibilidade articular.",
      "Vista complementar quando houver dúvida de alinhamento.",
    ],
    executionSteps: [
      "Selecione o protocolo funcional desejado.",
      "Marque checkpoints, trajetórias ou goniometria conforme o teste.",
      "Use snapshots e observações clínicas para documentar compensações.",
      "Exporte relatório apenas após revisar os frames-chave.",
    ],
    measuredOutputs: [
      "Ângulos clínicos relevantes",
      "Trajetórias e checkpoints",
      "Observações funcionais",
      "Snapshots comparativos",
    ],
    guidedTemplates: [
      {
        id: "functional-squat-check",
        title: "Agachamento funcional",
        goal: "Observar mobilidade, alinhamento e estratégia de movimento.",
        capturePreset: "Frontal + lateral, 60-120 fps.",
        idealFor: "screening geral, joelho, quadril, retorno ao treino",
        checklist: [
          "Registrar início, fundo e retorno do agachamento.",
          "Comparar alinhamento de joelho e tronco entre tentativas.",
        ],
        reportFocus: ["controle no fundo", "deslocamento do tronco", "simetria entre lados"],
        clinicalQuestions: [
          "O limite parece ser mobilidade ou estratégia de controle?",
          "A qualidade cai com repetição ou carga leve?",
        ],
      },
      {
        id: "functional-sport-task",
        title: "Gesto esportivo livre",
        goal: "Analisar checkpoints e momentos críticos de gesto específico.",
        capturePreset: "Ângulo adaptado ao gesto + snapshots-chave.",
        idealFor: "arremesso, chute, mudança de direção",
        checklist: [
          "Definir 3 a 5 checkpoints antes da captura.",
          "Salvar snapshots comentados dos eventos principais.",
        ],
        reportFocus: ["checkpoints do gesto", "momento crítico", "compensações relevantes"],
        clinicalQuestions: [
          "Qual fase do gesto concentra a maior perda de controle?",
          "O padrão observado se relaciona com dor ou queda de performance?",
        ],
      },
      {
        id: "functional-step-down",
        title: "Step-down controlado",
        goal: "Avaliar controle de joelho, pelve e tronco em tarefa unilateral.",
        capturePreset: "Frontal + lateral, 60-120 fps.",
        idealFor: "joelho, quadril, controle proximal",
        checklist: [
          "Registrar 3 repetições por lado.",
          "Salvar snapshots do ponto de maior carga.",
        ],
        reportFocus: ["controle de joelho", "pelve em apoio unilateral", "diferença entre lados"],
        clinicalQuestions: [
          "O joelho colapsa mais em um lado específico?",
          "A pelve se mantém estável durante a descida?",
        ],
      },
      {
        id: "functional-overhead-squat",
        title: "Overhead squat",
        goal: "Triar mobilidade global e compensações em cadeia cinética.",
        capturePreset: "Frontal + lateral com bastão acima da cabeça.",
        idealFor: "screening esportivo, mobilidade, retorno ao treino",
        checklist: [
          "Registrar início, fundo e retorno.",
          "Documentar compensações de tornozelo, tronco e ombro.",
        ],
        reportFocus: ["cadeias limitantes", "profundidade funcional", "compensações globais"],
        clinicalQuestions: [
          "A principal limitação vem de tornozelo, quadril ou ombro?",
          "O movimento piora com velocidade ou profundidade?",
        ],
      },
      {
        id: "functional-single-leg-rdl",
        title: "RDL unilateral",
        goal: "Avaliar equilíbrio, controle lombo-pélvico e cadeia posterior em apoio único.",
        capturePreset: "Lateral + frontal, 60-120 fps.",
        idealFor: "corrida, posterior de coxa, tornozelo, controle proximal",
        checklist: [
          "Registrar 3 repetições por lado.",
          "Salvar snapshot da posição de maior alcance.",
        ],
        reportFocus: [
          "estabilidade em apoio único",
          "alinhamento de pelve",
          "alcance com controle",
        ],
        clinicalQuestions: [
          "O tronco gira ou a pelve abre durante o gesto?",
          "O controle piora claramente em um dos lados?",
        ],
      },
    ],
    articles: [
      {
        id: "fms-meta-analysis-2017",
        title:
          "Reliability, Validity, and Injury Predictive Value of the Functional Movement Screen: A Systematic Review and Meta-analysis",
        authors: "Bonazza NA, et al.",
        year: 2017,
        journal: "American Journal of Sports Medicine",
        doi: "10.1177/0363546516641937",
        url: "https://pubmed.ncbi.nlm.nih.gov/27159297/",
        summary:
          "Revisão sistemática sobre confiabilidade, validade e valor preditivo do Functional Movement Screen.",
        clinicalTakeaway:
          "Serve como base para testes funcionais guiados e interpretação clínica conservadora.",
        group: "Esportiva",
        subgroup: "Funcional",
        evidence: "SystematicReview",
        tags: ["fms", "movimento funcional", "screening", "video analysis"],
      },
    ],
  },
};

export function normalizeEvidenceText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
