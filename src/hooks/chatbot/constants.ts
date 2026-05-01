import { MedicalKnowledge } from "./types";

export const mockMedicalKnowledge: MedicalKnowledge = {
  symptoms: {
    dor_nas_costas: {
      name: "Dor nas Costas",
      description: "Desconforto ou dor na região lombar, torácica ou cervical",
      severity: "medium",
      commonCauses: ["Má postura", "Esforço excessivo", "Sedentarismo", "Hérnia de disco"],
      recommendations: [
        "Aplicar compressas mornas",
        "Fazer alongamentos suaves",
        "Manter boa postura",
        "Evitar carregar peso excessivo",
      ],
      whenToSeekHelp: [
        "Dor intensa que não melhora com repouso",
        "Dormência ou formigamento nas pernas",
        "Dificuldade para caminhar",
        "Febre associada à dor",
      ],
      relatedSymptoms: ["rigidez_muscular", "dor_irradiada", "espasmo_muscular"],
    },
    dor_no_joelho: {
      name: "Dor no Joelho",
      description: "Desconforto ou dor na articulação do joelho",
      severity: "medium",
      commonCauses: ["Lesão ligamentar", "Artrite", "Sobrecarga", "Desgaste articular"],
      recommendations: [
        "Aplicar gelo nas primeiras 48h",
        "Elevar a perna quando possível",
        "Evitar atividades que causem dor",
        "Usar calçados adequados",
      ],
      whenToSeekHelp: [
        "Inchaço significativo",
        "Impossibilidade de apoiar o peso",
        "Deformidade visível",
        "Dor intensa e persistente",
      ],
      relatedSymptoms: ["inchaço", "rigidez", "instabilidade"],
    },
  },
  treatments: {
    fisioterapia_lombar: {
      name: "Fisioterapia Lombar",
      description: "Tratamento para dores e disfunções da região lombar",
      duration: "4-8 semanas",
      frequency: "2-3 vezes por semana",
      precautions: ["Não forçar movimentos dolorosos", "Comunicar qualquer piora"],
      contraindications: ["Fratura vertebral", "Infecção ativa", "Tumor"],
      expectedOutcomes: ["Redução da dor", "Melhora da mobilidade", "Fortalecimento muscular"],
    },
  },
  exercises: {
    alongamento_lombar: {
      name: "Alongamento Lombar",
      description: "Exercício para relaxar e alongar a musculatura lombar",
      instructions: [
        "Deite-se de costas",
        "Traga os joelhos ao peito",
        "Mantenha por 30 segundos",
        "Repita 3 vezes",
      ],
      duration: "5-10 minutos",
      repetitions: "3 séries de 30 segundos",
      difficulty: "beginner",
      targetAreas: ["Lombar", "Glúteos", "Quadril"],
      precautions: ["Não force o movemento", "Pare se sentir dor"],
    },
  },
  medications: {
    ibuprofeno: {
      name: "Ibuprofeno",
      genericName: "Ibuprofeno",
      dosage: "400-600mg",
      frequency: "A cada 6-8 horas",
      sideEffects: ["Dor de estômago", "Náusea", "Tontura"],
      interactions: ["Anticoagulantes", "Corticoides"],
      precautions: ["Tomar com alimentos", "Não exceder dose máxima"],
      storageInstructions: "Manter em local seco e arejado",
    },
  },
  emergencyKeywords: [
    "emergência", "urgente", "socorro", "dor intensa", "não consigo respirar",
    "desmaiei", "sangramento", "fratura", "acidente", "infarto", "avc",
  ],
};

export const predefinedResponses = {
  greeting: [
    "Olá! Sou o assistente virtual da FisioFlow. Como posso ajudá-lo hoje?",
    "Oi! Estou aqui para ajudar com suas dúvidas sobre fisioterapia e saúde.",
    "Bem-vindo! Sou seu assistente de saúde virtual. Em que posso ajudar?",
  ],
  appointment: [
    "Posso ajudá-lo a agendar uma consulta. Que tipo de atendimento você precisa?",
    "Vou verificar os horários disponíveis para você. Qual sua preferência de data?",
  ],
  exercise: [
    "Tenho várias opções de exercícios. Qual região do corpo você gostaria de trabalhar?",
    "Posso sugerir exercícios personalizados. Me conte sobre sua condição atual.",
  ],
  emergency: [
    "Percebo que pode ser uma situação urgente. Recomendo procurar atendimento médico imediatamente.",
    "Em caso de emergência, ligue 192 (SAMU) ou procure o hospital mais próximo.",
  ],
  unknown: [
    "Desculpe, não entendi completamente. Pode reformular sua pergunta?",
    "Não tenho certeza sobre isso. Gostaria de falar com um de nossos fisioterapeutas?",
    "Essa é uma pergunta interessante. Vou conectá-lo com um especialista.",
  ],
};
