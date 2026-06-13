export type PatientAssistantGuardrailReason =
  | "self_harm"
  | "emergency_symptoms"
  | "medication_or_diagnosis"
  | "unsafe_response";

export type PatientAssistantGuardrailResult =
  | { blocked: false }
  | {
      blocked: true;
      reason: PatientAssistantGuardrailReason;
      answer: string;
    };

const CONTACT_CLINIC =
  "Não consigo orientar esse caso pelo assistente automático. Entre em contato com a clínica para falar com a equipe.";

const EMERGENCY_RESPONSE =
  "Pelos sinais descritos, procure atendimento de urgência agora ou acione o serviço de emergência da sua região. Depois, avise a clínica quando for seguro.";

const SELF_HARM_RESPONSE =
  "Sinto muito que você esteja passando por isso. Procure ajuda imediata: fale com alguém de confiança e acione um serviço de emergência da sua região. No Brasil, você também pode ligar para o CVV pelo 188.";

const UNSAFE_RESPONSE =
  "Não encontrei uma orientação segura para responder isso automaticamente. Fale com o seu fisioterapeuta ou com a clínica antes de tomar qualquer decisão.";

const SELF_HARM_PATTERNS = [
  /\b(suic[ií]dio|suicidar|me matar|me ferir|autoagress[aã]o|me cortar|quero morrer|tirar minha vida)\b/i,
];

const EMERGENCY_PATTERNS = [
  /\b(dor no peito|aperto no peito|falta de ar|dificuldade para respirar|desmaio|convuls[aã]o)\b/i,
  /\b(perdi|perda|sem)\s+(for[cç]a|movimento|sensibilidade)\b/i,
  /\b(rosto torto|fala enrolada|confus[aã]o mental)\b/i,
  /\b(perna|panturrilha)\s+(muito\s+)?(inchada|vermelha).*\b(dor|quente)\b/i,
  /\b(febre|pus|secre[cç][aã]o|sangramento).*\b(cirurgia|opera[cç][aã]o|p[oó]s[- ]operat[oó]rio|cicatriz)\b/i,
];

const MEDICATION_OR_DIAGNOSIS_PATTERNS = [
  /\b(qual|que)\s+(rem[eé]dio|medicamento|anti[- ]?inflamat[oó]rio|antibi[oó]tico|analg[eé]sico)\b/i,
  /\b(posso|devo)\s+(tomar|usar|parar|suspender|aumentar|diminuir)\s+(rem[eé]dio|medicamento|dose|dosagem)\b/i,
  /\b(dose|dosagem|receita|prescri[cç][aã]o)\b/i,
  /\b(meu diagn[oó]stico|tenho uma les[aã]o|rompi o ligamento|fraturei)\b/i,
];

const UNSAFE_RESPONSE_PATTERNS = [
  /\b(tome|use)\s+\d+\s*(mg|ml|comprimidos?)\b/i,
  /\b(voc[eê]\s+deve|recomendo)\s+(tomar|usar|parar|suspender|aumentar|diminuir)\s+(rem[eé]dio|medicamento|dose|dosagem)\b/i,
  /\b(seu diagn[oó]stico [eé]|voc[eê] tem uma? (les[aã]o|fratura|ruptura))\b/i,
  /\bn[aã]o precisa procurar (atendimento|m[eé]dico|urg[eê]ncia|a cl[ií]nica)\b/i,
];

export function guardPatientAssistantPrompt(query: string): PatientAssistantGuardrailResult {
  if (matchesAny(query, SELF_HARM_PATTERNS)) {
    return { blocked: true, reason: "self_harm", answer: SELF_HARM_RESPONSE };
  }

  if (matchesAny(query, EMERGENCY_PATTERNS)) {
    return { blocked: true, reason: "emergency_symptoms", answer: EMERGENCY_RESPONSE };
  }

  if (matchesAny(query, MEDICATION_OR_DIAGNOSIS_PATTERNS)) {
    return { blocked: true, reason: "medication_or_diagnosis", answer: CONTACT_CLINIC };
  }

  return { blocked: false };
}

export function guardPatientAssistantResponse(answer: string): PatientAssistantGuardrailResult {
  if (matchesAny(answer, UNSAFE_RESPONSE_PATTERNS)) {
    return { blocked: true, reason: "unsafe_response", answer: UNSAFE_RESPONSE };
  }

  return { blocked: false };
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}
