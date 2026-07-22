/**
 * Flag de acesso do paciente à base de conhecimento.
 *
 * DESLIGADA por padrão: o assistente de orientações do paciente só entra em ação
 * quando o admin liga `settings.patient_knowledge_enabled` no painel. Enquanto off,
 * a rota do paciente não consulta nenhuma KB.
 */
export const PATIENT_KNOWLEDGE_FLAG = "patient_knowledge_enabled";

export function isPatientKnowledgeEnabled(settings: unknown): boolean {
  if (!settings || typeof settings !== "object") return false;
  return (settings as Record<string, unknown>)[PATIENT_KNOWLEDGE_FLAG] === true;
}
