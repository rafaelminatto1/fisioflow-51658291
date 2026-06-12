export type ConciergeIntent = "scheduling" | "information" | "urgent" | "other";

const SENSITIVE_PATTERN =
  /\b(dor|les[ãa]o|cirurgia|medicamento|rem[ée]dio|diagn[óo]stico|piora|inchaço|inchaco|dormência|dormencia|queda|tontura)\b/i;

/**
 * Respostas sensíveis (urgência ou conteúdo clínico) exigem aprovação humana
 * antes do envio. Saudações e agendamento simples seguem automáticos.
 */
export function needsHumanApproval(intent: ConciergeIntent, originalMessage: string): boolean {
  if (intent === "urgent") return true;
  if (intent === "information" && SENSITIVE_PATTERN.test(originalMessage)) return true;
  return false;
}
