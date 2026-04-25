import type { PhysioDictionaryEntry } from "./physioDictionary";

export interface ProtocolPhase {
  name: string;
  duration?: string; // e.g., "1-4 semanas"
  objectives: string[];
  exercises: string[]; // IDs from exerciseDictionary
  criteria: string[]; // IDs from physioDictionary or text
}

export interface ProtocolEntry extends PhysioDictionaryEntry {
  category: "procedure";
  subcategory: "Protocolo";
  phases: ProtocolPhase[];
}

export const protocolDictionary: ProtocolEntry[] = [
  {
    id: "prot_acl",
    pt: "Reconstrução de LCA (Padrão Ouro)",
    en: "ACL Reconstruction (Gold Standard)",
    category: "procedure",
    subcategory: "Protocolo",
    aliases_pt: ["LCA", "Cruzado Anterior", "Pós-op LCA"],
    aliases_en: ["ACL", "Anterior Cruciate Ligament", "ACLR"],
    description_pt:
      "Protocolo fásico para reabilitação de LCA, focado em retorno seguro ao esporte.",
    phases: [
      {
        name: "Fase 1: Proteção e Ativação",
        duration: "0-2 semanas",
        objectives: ["Controle de edema", "Extensão total de joelho", "Ativação de quadríceps"],
        exercises: ["exd-ativação-vmo", "exd-agachamento-parede", "exd-along-panturrilha"],
        criteria: ["Extensão passiva simétrica", "Controle de derrame articular"],
      },
      {
        name: "Fase 2: Carga e Mobilidade",
        duration: "2-6 semanas",
        objectives: ["Normalização da marcha", "Equilíbrio unipodal", "Força inicial"],
        exercises: ["exd-ponte-gluteo", "exd-agachamento", "exd-apoio-unipodal", "exd-step-up"],
        criteria: ["Marcha sem auxílio", "Flexão de joelho > 110º"],
      },
      {
        name: "Fase 3: Fortalecimento Avançado",
        duration: "6-12 semanas",
        objectives: ["Hipertrofia", "Controle de valgo dinâmico", "Potência inicial"],
        exercises: ["exd-agachamento-bulgaro", "exd-stiff", "exd-step-down", "exd-leg-press"],
        criteria: ["LSI (Limb Symmetry Index) > 80% em força"],
      },
      {
        name: "Fase 4: Retorno ao Esporte",
        duration: "12+ semanas",
        objectives: ["Pliometria", "Mudança de direção", "Retorno à modalidade"],
        exercises: ["exd-salto-unipodal", "exd-box-jump", "exd-jump-squat", "exd-skipping"],
        criteria: ["Hopping tests > 90% simetria", "Ausência de medo do movimento"],
      },
    ],
  },
  {
    id: "prot_hernia_lombar",
    pt: "Gestão de Hérnia de Disco Lombar",
    en: "Lumbar Disc Herniation Management",
    category: "procedure",
    subcategory: "Protocolo",
    aliases_pt: ["Ciatalgia", "Hérnia Lombar", "Lombociatalgia"],
    aliases_en: ["Disc Herniation", "Sciatica", "Lumbar Radiculopathy"],
    description_pt: "Protocolo baseado em centralização de sintomas e mobilização neural.",
    phases: [
      {
        name: "Fase Aguda: Centralização",
        objectives: ["Redução da dor irradiada", "Educação em dor"],
        exercises: ["exd-mckenzie", "exd-child-pose", "exd-respiracao-diafragmatica"],
        criteria: ["Centralização dos sintomas (Sinal de McKenzie)"],
      },
      {
        name: "Fase Subaguda: Mobilidade e Nervo",
        objectives: ["Ganho de ADM de flexão/extensão", "Deslizamento neural"],
        exercises: ["exd-neuro-ciatico", "exd-cat-cow", "exd-dead-bug"],
        criteria: ["Teste de Slump negativo ou melhorado"],
      },
      {
        name: "Fase de Estabilização",
        objectives: ["Fortalecimento do core", "Retorno às atividades"],
        exercises: ["exd-bird-dog", "exd-prancha-ventral", "exd-ponte-gluteo"],
        criteria: ["Estabilidade lombo-pélvica mantida sob carga"],
      },
    ],
  },
  {
    id: "prot_hipermobilidade",
    pt: "Protocolo de Estabilidade para Hipermobilidade (SED/HSD)",
    en: "Hypermobility Stability Protocol",
    category: "procedure",
    subcategory: "Protocolo",
    aliases_pt: ["SED", "Hipermobilidade Articular", "Ehlers-Danlos"],
    aliases_en: ["EDS", "HSD", "Joint Hypermobility"],
    description_pt: "Foco em propriocepção, controle motor e estabilização articular profunda.",
    phases: [
      {
        name: "Fase 1: Consciência e Isometria",
        objectives: ["Consciência articular", "Ativação tônica"],
        exercises: ["exd-apoio-unipodal", "exd-ativação-vmo", "exd-retração-cervical-isometrica"],
        criteria: ["Controle de hiperestensão durante exercícios"],
      },
      {
        name: "Fase 2: Estabilidade Dinâmica",
        objectives: ["Fortalecimento funcional", "Propriocepção"],
        exercises: ["exd-pallof-press", "exd-ponte-unilateral-isom", "exd-monster-walk"],
        criteria: ["Equilíbrio mantido em superfícies instáveis"],
      },
    ],
  },
  {
    id: "prot_impingement_ombro",
    pt: "Síndrome do Impacto / Manguito Rotador",
    en: "Shoulder Impingement / Rotator Cuff",
    category: "procedure",
    subcategory: "Protocolo",
    aliases_pt: ["Impacto", "Bursite", "Manguito"],
    aliases_en: ["Impingement", "Bursitis", "Rotator Cuff"],
    description_pt: "Gestão conservadora focada em controle escapular e força do manguito.",
    phases: [
      {
        name: "Fase 1: Controle de Sintomas e Escápula",
        objectives: ["Redução da dor", "Controle motor escapular"],
        exercises: ["exd-pendular-codman", "exd-serratus-punch", "exd-retracão-escapular"],
        criteria: ["Dor < 3/10 em repouso"],
      },
      {
        name: "Fase 2: Fortalecimento do Manguito",
        objectives: ["Força de rotadores", "Estabilidade dinâmica"],
        exercises: ["exd-rot-ext-ombro", "exd-rot-int-ombro", "exd-full-can", "exd-wall-slides"],
        criteria: ["Elevação de ombro sem dor em arco médio"],
      },
    ],
  },
  {
    id: "prot_epicondilite_lateral",
    pt: "Epicondilalgia Lateral (Cotovelo de Tenista)",
    en: "Lateral Epicondylalgia (Tennis Elbow)",
    category: "procedure",
    subcategory: "Protocolo",
    aliases_pt: ["Epicondilite", "Cotovelo de Tenista"],
    aliases_en: ["Tennis Elbow", "Lateral Epicondylitis"],
    description_pt: "Foco em carga progressiva e exercícios excêntricos.",
    phases: [
      {
        name: "Fase 1: Isometria e Analgesia",
        objectives: ["Controle de dor", "Início de carga"],
        exercises: ["exd-extensao-punho", "exd-neuro-radial"],
        criteria: ["Capacidade de realizar isometria sem dor excessiva"],
      },
      {
        name: "Fase 2: Fortalecimento Excêntrico",
        objectives: ["Remodelamento tendíneo"],
        exercises: ["exd-flexbar-tyler", "exd-extensao-punho", "exd-supinacao-pronacao"],
        criteria: ["Aumento da força de preensão manual"],
      },
    ],
  },
  {
    id: "prot_entorse_tornozelo",
    pt: "Entorse de Tornozelo (Inversão)",
    en: "Ankle Sprain (Inversion)",
    category: "procedure",
    subcategory: "Protocolo",
    aliases_pt: ["Entorse", "Torção de Tornozelo", "Lesão de Ligamento"],
    aliases_en: ["Ankle Sprain", "Lateral Ligament Injury"],
    description_pt: "Gestão de fase aguda até retorno ao esporte com foco em estabilidade.",
    phases: [
      {
        name: "Fase 1: Proteção e Mobilidade",
        objectives: ["Proteção tecidual", "Ganho de dorsiflexão"],
        exercises: ["exd-mob-tornozelo", "exd-eversao-tornozelo", "exd-respiracao-diafragmatica"],
        criteria: ["Redução do edema", "Carga tolerada"],
      },
      {
        name: "Fase 2: Propriocepção e Equilíbrio",
        objectives: ["Estabilidade reflexa", "Fortalecimento de eversores"],
        exercises: ["exd-apoio-unipodal", "exd-disco-proprioceptivo", "exd-pant-em-pe"],
        criteria: ["Equilíbrio unipodal > 30s"],
      },
    ],
  },
  {
    id: "prot_fascite_plantar",
    pt: "Fascite Plantar / Fasciopatia",
    en: "Plantar Fasciitis / Fasciopathy",
    category: "procedure",
    subcategory: "Protocolo",
    aliases_pt: ["Dor no calcanhar", "Esporão"],
    aliases_en: ["Plantar Fasciitis", "Heel Pain"],
    description_pt: "Protocolo de carga progressiva (Rathleff) e alongamento.",
    phases: [
      {
        name: "Fase 1: Alongamento e Analgesia",
        objectives: ["Redução da tensão na fáscia", "Melhora da dorsiflexão"],
        exercises: ["exd-along-panturrilha", "exd-along-soleo", "exd-lacrosse-ball"],
        criteria: ["Dor matinal reduzida"],
      },
      {
        name: "Fase 2: Fortalecimento de Intrinsecos",
        objectives: ["Suporte do arco medial", "Carga progressiva"],
        exercises: ["exd-pant-em-pe", "exd-grip-strengthening"],
        criteria: ["Tolerância à caminhada prolongada"],
      },
    ],
  },
];
