export type ConciergeIntent = "scheduling" | "information" | "urgent" | "other";

const SENSITIVE_PATTERN =
  /\b(dor(es)?|les[ãa]o|les[õo]es|cirurgia|medicamento|rem[ée]dio|diagn[óo]stico|pior\w*|incha\w*|dorm[êe]nc\w*|dormente|queda|caiu|tontura|machucad\w*|sangr\w*)\b/i;

/**
 * Respostas sensíveis (urgência ou conteúdo clínico) exigem aprovação humana
 * antes do envio. Saudações e agendamento simples seguem automáticos.
 */
export function needsHumanApproval(intent: ConciergeIntent, originalMessage: string): boolean {
  if (intent === "urgent") return true;
  if (intent === "information" && SENSITIVE_PATTERN.test(originalMessage)) return true;
  return false;
}
