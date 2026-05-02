export interface TUSSCode {
  code: string;
  label: string;
  description: string;
  category: "fisioterapia" | "rpg" | "acupuntura" | "pilates" | "outros";
}

export const TUSS_FISIO_LIST: TUSSCode[] = [
  // CONSULTA E AVALIAÇÃO
  {
    code: "50000144",
    label: "Consulta Fisioterapêutica",
    description: "Avaliação inicial para diagnóstico fisioterapêutico e elaboração do plano de tratamento.",
    category: "fisioterapia",
  },

  // FISIOTERAPIA / TRAUMATO-ORTOPEDIA (SESSÕES)
  {
    code: "20103484",
    label: "Patologia Osteomioarticular (1 membro)",
    description: "Sessão completa para tratamento de um membro (ex: braço ou perna). Inclui Ultrassom, TENS e calor.",
    category: "fisioterapia",
  },
  {
    code: "20103492",
    label: "Patologia Osteomioarticular (2 ou mais membros)",
    description: "Sessão para reabilitação de múltiplos membros ou segmentos corporais simultaneamente.",
    category: "fisioterapia",
  },
  {
    code: "20103506",
    label: "Patologia Osteomioarticular (Coluna)",
    description: "Atendimento fisioterapêutico focado em um segmento da coluna (Cervical, Torácica ou Lombar).",
    category: "fisioterapia",
  },
  {
    code: "20103514",
    label: "Patologia Osteomioarticular (Múltiplos segmentos Coluna)",
    description: "Tratamento de patologias que afetam diferentes segmentos da coluna ou bacia.",
    category: "fisioterapia",
  },
  {
    code: "20103662",
    label: "Recuperação Pós-Operatória",
    description: "Fisioterapia focada na reabilitação funcional após intervenções cirúrgicas ortopédicas.",
    category: "fisioterapia",
  },

  // ELETROTERAPIA E LASER (ESPECÍFICOS)
  {
    code: "31602185",
    label: "TENS / Estimulação Elétrica",
    description: "Aplicação isolada de eletroestimulação transcutânea para analgesia e alívio de dor.",
    category: "fisioterapia",
  },
  {
    code: "20104014",
    label: "Actinoterapia (Laser / Luz)",
    description: "Tratamento que utiliza luz (como Laser de Baixa Intensidade) para cicatrização e inflamação.",
    category: "fisioterapia",
  },

  // RPG E POSTURA
  {
    code: "20103182",
    label: "RPG / Desvios Posturais",
    description: "Reeducação Postural Global para correção de escolioses, hipercifoses e desvios da coluna.",
    category: "rpg",
  },
  {
    code: "20103999",
    label: "RPG - Sessão Técnica",
    description: "Sessão de alongamento global e cadeias musculares (código técnico alternativo).",
    category: "rpg",
  },

  // PILATES E CINESIOTERAPIA
  {
    code: "20103522",
    label: "Pilates Clínico / Cinesioterapia Funcional",
    description: "Exercícios terapêuticos focados em controle motor, fortalecimento e estabilização.",
    category: "pilates",
  },
  {
    code: "20103115",
    label: "Técnicas Cinesioterápicas Específicas",
    description: "Utilizado para Liberação Miofascial, Maitland, Mulligan e mobilizações articulares.",
    category: "fisioterapia",
  },

  // ACUPUNTURA
  {
    code: "31602033",
    label: "Acupuntura com agulhas",
    description: "Sessão tradicional de inserção de agulhas para tratamento de dores e desequilíbrios.",
    category: "acupuntura",
  },
  {
    code: "50000462",
    label: "Sessão de Acupuntura (Simplificado)",
    description: "Código de faturamento rápido para sessões ambulatoriais de acupuntura.",
    category: "acupuntura",
  },

  // TERAPIA MANUAL E OUTROS
  {
    code: "20103336",
    label: "Manipulação Vertebral",
    description: "Ajustes de alta velocidade (estalidos) e manobras de quiropraxia clínica na coluna.",
    category: "fisioterapia",
  },
  {
    code: "20103212",
    label: "Drenagem Linfática Manual",
    description: "Tratamento de edemas, linfedemas e pós-operatórios circulatórios.",
    category: "outros",
  },
];
