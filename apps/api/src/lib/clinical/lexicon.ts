/**
 * Léxico clínico da clínica — vocabulário controlado das evoluções em texto livre.
 *
 * Why: 11.346 evoluções vivem em `sessions.observacao` como texto. Elas não são
 * prosa: são listas de conduta com vocabulário muito repetido (83% mencionam
 * liberação miofascial, 80% trazem padrão `NxM`). Este léxico é o que torna esse
 * corpus consultável sem recorrer a IA.
 *
 * Método: cada termo foi confirmado por co-ocorrência anatômica no próprio corpus,
 * não por suposição. Exemplo: `QDP` parecia "quadrado plantar" numa leitura
 * isolada, mas aparece pareado com `IQT` em SLR anterior, cadeira extensora e
 * step down — é quadríceps. O corpus é a fonte de verdade; a revisão humana serve
 * para arbitrar empates, não para construir a lista.
 *
 * Regra: mudou o léxico → suba `LEXICON_VERSION`. Ele é gravado junto de cada
 * extração para que a camada derivada seja reconstruível e auditável.
 */

export const LEXICON_VERSION = "2026-07-31.3";

export interface LexEntry {
  /** Identificador estável, usado em índices e agregações. */
  code: string;
  /** Rótulo em PT-BR para exibição. */
  label: string;
  /** Grafias aceitas, incluindo erros de digitação observados no corpus. */
  patterns: string[];
}

/** Constrói um regex que casa qualquer grafia da entrada, com fronteira de palavra. */
export function entryRegex(entry: LexEntry): RegExp {
  const alt = entry.patterns
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .sort((a, b) => b.length - a.length)
    .join("|");
  return new RegExp(`(?<![\\p{L}])(?:${alt})(?![\\p{L}])`, "iu");
}

// ===========================================================================
// CONDUTAS / RECURSOS TERAPÊUTICOS
// ===========================================================================

/**
 * `liberacao_miofascial_manual` e `_massage_gun` são a MESMA técnica com
 * instrumento diferente, e a distinção é deliberada: a manual permite palpação
 * diagnóstica e dosagem por feedback do paciente; a pistola é percussão mecânica,
 * mais rápida e padronizada. São esforços profissionais distintos.
 */
export const CONDUTAS: LexEntry[] = [
  {
    code: "liberacao_miofascial_massage_gun",
    label: "Liberação miofascial com massage gun",
    patterns: [
      "lib mio com massage gun", "lib mio com massagem gun", "lib mio com massagen gun",
      "liberacao mio com massage gun", "liberação mio com massage gun",
      "lib miofascial com massage gun", "liberação miofascial com massage gun",
      "massage gun", "massagem gun", "massagen gun", "pistola de massagem",
    ],
  },
  {
    code: "liberacao_miofascial_manual",
    label: "Liberação miofascial manual",
    patterns: [
      "lib mio manual", "lib mio  manual", "liberacao mio manual", "liberação mio manual",
      "lib miofascial manual", "liberacao miofascial manual", "liberação miofascial manual",
      "lib mio", "liberacao mio", "liberação mio", "liberacao miofascial", "liberação miofascial",
      "auto liberacao", "auto liberação",
    ],
  },
  {
    code: "eletroestimulacao_neuromuscular",
    label: "Eletroestimulação neuromuscular (EENM)",
    patterns: ["EENM", "ENNM", "FES", "corrente russa", "russa"],
  },
  { code: "tens", label: "TENS", patterns: ["TENS acup", "tens acupuntural", "TENS"] },
  { code: "laser", label: "Laser", patterns: ["laser", "laserterapia"] },
  {
    code: "terapia_combinada",
    label: "Terapia combinada",
    patterns: ["terapia combinada", "combinada"],
  },
  {
    code: "mobilizacao_articular",
    label: "Mobilização articular",
    patterns: ["mobilizacao articular", "mobilização articular", "mob articular", "mob"],
  },
  {
    code: "mobilizacao_com_movimento",
    label: "Mobilização com movimento (MWM/Mulligan)",
    patterns: ["MWM", "mulligan", "mobilizacao com movimento", "mobilização com movimento"],
  },
  { code: "tracao", label: "Tração", patterns: ["tracao", "tração"] },
  {
    code: "alongamento",
    label: "Alongamento",
    patterns: ["alongamento", "alonga", "along", "flexibilidade"],
  },
  {
    code: "propriocepcao",
    label: "Propriocepção / equilíbrio",
    patterns: ["propriocepcao", "propriocepção", "proprio", "equilibrio", "equilíbrio"],
  },
  {
    code: "treino_marcha",
    label: "Treino de marcha",
    patterns: ["treino de marcha", "treino da marcha", "marcha"],
  },
  {
    code: "energia_muscular",
    label: "Técnica de energia muscular",
    patterns: ["energia muscular"],
  },
  {
    code: "crioterapia",
    label: "Crioterapia",
    patterns: ["crioterapia", "gelo", "bolsa de gelo"],
  },
  {
    code: "termoterapia",
    label: "Termoterapia",
    patterns: ["compressa quente", "bolsa quente", "termoterapia", "esteira quente", "bota"],
  },
  {
    code: "aerobico",
    label: "Condicionamento aeróbico",
    patterns: ["esteira", "bike", "bicicleta", "eliptico", "elíptico", "corrida"],
  },
];

// ===========================================================================
// EQUIPAMENTOS
// ===========================================================================

export const EQUIPAMENTOS: LexEntry[] = [
  { code: "thera_band", label: "Thera band / elástico", patterns: ["thera band", "theraband", "thera-band", "elastico", "elástico", "faixa elastica", "faixa elástica"] },
  { code: "kettlebell", label: "Kettlebell", patterns: ["KTB", "kettlebell"] },
  { code: "trx", label: "TRX", patterns: ["TRX"] },
  { code: "caneleira", label: "Caneleira", patterns: ["caneleira"] },
  { code: "halter", label: "Halter", patterns: ["halter", "halteres"] },
  { code: "bola_suica", label: "Bola suíça", patterns: ["bola suica", "bola suíça"] },
  { code: "step", label: "Step", patterns: ["step"] },
  { code: "espaldar", label: "Espaldar", patterns: ["espaldar"] },
  { code: "bosu", label: "Bosu / disco", patterns: ["bosu", "disco de equilibrio", "disco de equilíbrio"] },
];

// ===========================================================================
// REGIÕES CORPORAIS E MÚSCULOS
// ===========================================================================

/**
 * Siglas confirmadas por co-ocorrência no corpus:
 * - TFS/TTFFSS/TTFFS/TSF → aparecem com paravertebral torácico, periescapular,
 *   clavícula e tração cervical ⇒ trapézio fibras superiores (TTFFSS é o plural,
 *   pela convenção brasileira de duplicar letras, como MMII/MMSS).
 * - IQT → aparece com tuberosidade isquiática, ponte e cocontração ⇒ isquiotibiais.
 * - QDP → aparece pareado com IQT em SLR anterior, cadeira extensora e step down
 *   ⇒ quadríceps (NÃO quadrado plantar).
 */
export const REGIOES: LexEntry[] = [
  { code: "cervical", label: "Cervical", patterns: ["cervical", "pescoco", "pescoço"] },
  { code: "toracica", label: "Torácica", patterns: ["toracica", "torácica", "toracico", "torácico", "dorsal"] },
  { code: "lombar", label: "Lombar", patterns: ["lombar", "lombo"] },
  { code: "sacroiliaca", label: "Sacroilíaca", patterns: ["sacroiliaca", "sacroilíaca", "SI", "sacro"] },
  { code: "paravertebral", label: "Paravertebral", patterns: ["paravertebral", "paravertebrais"] },
  { code: "trapezio_fibras_superiores", label: "Trapézio fibras superiores", patterns: ["TTFFSS", "TTFFS", "TFS", "TSF", "trapezio fibras superiores", "trapézio fibras superiores", "trapezio superior", "trapézio superior"] },
  { code: "trapezio_fibras_inferiores", label: "Trapézio fibras inferiores", patterns: ["TFI", "trapezio fibras inferiores", "trapézio fibras inferiores", "trapezio inferior", "trapézio inferior"] },
  { code: "escapular", label: "Escapular / periescapular", patterns: ["periescapular", "periescapualr", "escapular", "escapula", "escápula", "omoplata"] },
  { code: "ombro", label: "Ombro", patterns: ["ombro", "glenoumeral", "GUD", "GUE", "GU", "manguito rotador", "manguito", "deltoide", "deltóide", "supraespinhoso"] },
  { code: "acromioclavicular", label: "Acromioclavicular", patterns: ["acromioclavicular", "AC", "clavicula", "clavícula"] },
  { code: "cotovelo", label: "Cotovelo", patterns: ["cotovelo", "epicondilo", "epicôndilo"] },
  { code: "punho_mao", label: "Punho / mão", patterns: ["punho", "mao", "mão", "carpo", "intrinsecos da mao", "intrínsecos da mão"] },
  { code: "peitoral", label: "Peitoral", patterns: ["peitoral", "peitorais"] },
  { code: "quadril", label: "Quadril", patterns: ["quadril", "coxofemoral", "gluteo", "glúteo", "gluteo medio", "glúteo médio", "gluteo maximo", "glúteo máximo", "piriforme"] },
  { code: "quadriceps", label: "Quadríceps", patterns: ["QDP", "quadriceps", "quadríceps", "vasto medial", "vasto lateral", "VMO", "reto femoral"] },
  { code: "isquiotibiais", label: "Isquiotibiais", patterns: ["IQT", "isquiotibiais", "isquiotibial", "posteriores de coxa"] },
  { code: "trato_iliotibial", label: "Trato iliotibial", patterns: ["TIT", "trato iliotibial", "trato ilio-tibial", "banda iliotibial"] },
  { code: "joelho", label: "Joelho", patterns: ["joelho", "patelar", "patela", "femurotibial", "femuropatelar", "LCA", "LCP", "LCL", "LCM", "menisco"] },
  { code: "perna_panturrilha", label: "Perna / panturrilha", patterns: ["panturrilha", "triceps sural", "tríceps sural", "gastrocnemio", "gastrocnêmio", "soleo", "sóleo", "tibial anterior"] },
  { code: "tornozelo_pe", label: "Tornozelo / pé", patterns: ["tornozelo", "talocrural", "subtalar", "maleolo", "maléolo", "fascia plantar", "fáscia plantar", "calcaneo", "calcâneo", "pe", "pé"] },
  { code: "core", label: "CORE / abdômen", patterns: ["CORE", "core", "abdominal", "abdomen", "abdômen", "transverso do abdomen"] },
  { code: "mmii", label: "Membros inferiores", patterns: ["MMII", "MID", "MIE", "membros inferiores", "membro inferior"] },
  { code: "mmss", label: "Membros superiores", patterns: ["MMSS", "MSD", "MSE", "membros superiores", "membro superior"] },
];

// ===========================================================================
// POSICIONAMENTO E PLANO DE MOVIMENTO
// ===========================================================================

export const POSICOES: LexEntry[] = [
  { code: "decubito_dorsal", label: "Decúbito dorsal", patterns: ["DD", "decubito dorsal", "decúbito dorsal"] },
  { code: "decubito_ventral", label: "Decúbito ventral", patterns: ["DV", "decubito ventral", "decúbito ventral"] },
  { code: "decubito_lateral", label: "Decúbito lateral", patterns: ["DL", "decubito lateral", "decúbito lateral"] },
  { code: "sentado", label: "Sentado", patterns: ["sentado", "sentada"] },
  { code: "bipede", label: "Bípede / em pé", patterns: ["bipede", "bípede", "em pe", "em pé", "ortostase"] },
];

/**
 * Rotação lateral e externa são o mesmo movimento, assim como medial e interna —
 * a clínica usa os dois pares de forma intercambiável (`Mob de RL e RM de GU D`,
 * `Flex / Abd / RI / RE`). Ficam sob o mesmo código para que a agregação não
 * fragmente o mesmo achado em duas linhas.
 */
export const PLANOS_MOBILIZACAO: LexEntry[] = [
  { code: "antero_posterior", label: "Ântero-posterior", patterns: ["AP", "antero-posterior", "ântero-posterior"] },
  { code: "postero_anterior", label: "Póstero-anterior", patterns: ["PA", "postero-anterior", "póstero-anterior"] },
  { code: "latero_lateral", label: "Látero-lateral", patterns: ["LL", "latero-lateral", "látero-lateral"] },
  {
    code: "rotacao_interna",
    label: "Rotação interna / medial",
    patterns: ["RI", "RM", "rotacao interna", "rotação interna", "rotacao medial", "rotação medial", "rot int", "rot med"],
  },
  {
    code: "rotacao_externa",
    label: "Rotação externa / lateral",
    patterns: ["RE", "RL", "rotacao externa", "rotação externa", "rotacao lateral", "rotação lateral", "rot ext", "rot lat"],
  },
];

// ===========================================================================
// EXERCÍCIOS
// ===========================================================================

/**
 * Exercício é um eixo distinto de conduta: `EENM em lombar realizando PQD` traz
 * recurso (eletroestimulação) e exercício (paraquedista) na mesma frase, e os
 * dois precisam ser consultáveis separadamente.
 *
 * `PQD` = paraquedista — extensão de tronco em decúbito ventral. Confirmado pela
 * fisioterapeuta e pelo corpus, onde aparece ao lado de prancha, dead bug e
 * perdigueiro, sempre com duração (`PQD 3x30''`). **Não** é variante de `QDP`
 * (quadríceps), apesar do anagrama: são coisas diferentes que coexistem no mesmo
 * texto.
 */
export const EXERCICIOS: LexEntry[] = [
  { code: "ponte", label: "Ponte / elevação pélvica", patterns: ["elevacao pelvica", "elevação pélvica", "ponte"] },
  { code: "agachamento", label: "Agachamento", patterns: ["front squat", "agachamento", "squat"] },
  { code: "afundo", label: "Afundo / avanço", patterns: ["afundo", "avanco", "avanço", "lunge"] },
  { code: "step", label: "Step up / step down", patterns: ["step down", "stepdown", "step up", "stepup", "subir no step"] },
  { code: "slr", label: "SLR (elevação de perna estendida)", patterns: ["SLR", "elevacao de perna estendida", "elevação de perna estendida"] },
  { code: "prancha", label: "Prancha", patterns: ["prancha lateral", "prancha lat", "prancha"] },
  { code: "paraquedista", label: "Paraquedista (extensão de tronco em DV)", patterns: ["PQD", "paraquedista", "para-quedista"] },
  { code: "perdigueiro", label: "Perdigueiro (bird dog)", patterns: ["perdigueiro", "bird dog"] },
  { code: "dead_bug", label: "Dead bug / bicho morto", patterns: ["dead bug", "deadbug", "bicho morto"] },
  { code: "remada", label: "Remada", patterns: ["remada"] },
  { code: "cadeira_extensora", label: "Cadeira extensora", patterns: ["cadeira extensora", "cad ext"] },
  { code: "cadeira_flexora", label: "Cadeira flexora", patterns: ["cadeira flexora", "cad flx"] },
  { code: "leg_press", label: "Leg press", patterns: ["leg press", "legpress"] },
  { code: "abdominal", label: "Abdominal", patterns: ["abdominais", "abdominal"] },
];

/**
 * Siglas frequentes ainda NÃO confirmadas. Não geram extração — ficam aqui para
 * não serem esquecidas e para que a revisão humana tenha uma lista curta e
 * específica em vez de uma conversa aberta.
 *
 * Vazia desde 31/07/2026: RL, RM, PQD e GU foram confirmados pela fisioterapeuta.
 * Duas hipóteses minhas estavam erradas e teriam corrompido os indicadores:
 * `PQD` não é quadríceps (é exercício) e `RM` não é repetição máxima (é rotação
 * medial). Manter esta lista é o que impede um palpite de virar dado.
 */
export const NAO_RESOLVIDOS: Array<{ sigla: string; ocorrencias: number; hipotese: string }> = [];

export const LEXICON = {
  condutas: CONDUTAS,
  equipamentos: EQUIPAMENTOS,
  regioes: REGIOES,
  posicoes: POSICOES,
  planos: PLANOS_MOBILIZACAO,
  exercicios: EXERCICIOS,
} as const;

export type LexiconCategory = keyof typeof LEXICON;
