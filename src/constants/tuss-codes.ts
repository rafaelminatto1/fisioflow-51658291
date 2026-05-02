export interface TUSSCode {
  code: string;
  label: string;
  description: string;
  category: "fisioterapia" | "rpg" | "acupuntura" | "pilates";
}

export const TUSS_FISIO_LIST: TUSSCode[] = [
  // FISIOTERAPIA GERAL / ORTOPÉDICA
  {
    code: "50000144",
    label: "Consulta Fisioterapêutica",
    description: "Avaliação inicial ou retorno para diagnóstico e plano de tratamento.",
    category: "fisioterapia",
  },
  {
    code: "20103433",
    label: "Fisio Traumato-Ortopédica (1 membro)",
    description: "Tratamento de lesões ósseas, musculares ou articulares em um único segmento (ex: ombro).",
    category: "fisioterapia",
  },
  {
    code: "20103441",
    label: "Fisio Traumato-Ortopédica (2 ou mais)",
    description: "Tratamento de patologias em múltiplos membros ou segmentos corporais.",
    category: "fisioterapia",
  },
  {
    code: "20103450",
    label: "Fisio de Coluna Vertebral",
    description: "Reabilitação focada em dores nas costas, hérnias e desalinhamentos posturais.",
    category: "fisioterapia",
  },
  {
    code: "20103662",
    label: "Fisio Pós-Operatória",
    description: "Recuperação funcional após cirurgias ortopédicas com complicações neurovasculares.",
    category: "fisioterapia",
  },
  
  // RPG
  {
    code: "20103999", // Frequentemente usado para RPG quando não há código específico no convênio
    label: "RPG - Reeducação Postural Global",
    description: "Técnica de fisioterapia para correção de postura através de alongamentos globais.",
    category: "rpg",
  },

  // ACUPUNTURA
  {
    code: "31602033",
    label: "Acupuntura com agulhas",
    description: "Sessão de estimulação de pontos específicos do corpo para alívio de dor e cura.",
    category: "acupuntura",
  },
  {
    code: "50000462",
    label: "Sessão de Acupuntura",
    description: "Código simplificado para faturamento de sessão única de acupuntura.",
    category: "acupuntura",
  },

  // PILATES
  {
    code: "20103522", // Muitas vezes faturado como reabilitação de endoprótese/cinesioterapia funcional
    label: "Pilates Clínico / Cinesioterapia",
    description: "Exercícios terapêuticos focados em controle motor, fortalecimento e flexibilidade.",
    category: "pilates",
  },
];
