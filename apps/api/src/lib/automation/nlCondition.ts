import { conditionOps, type ConditionOp } from "./types";

export const NL_CONDITION_SYSTEM =
  "Você converte uma regra em linguagem natural numa condição de automação clínica. " +
  "Campos comuns do evento (use notação ponto): patient.name, patient.inactiveDays, " +
  "appointment.status, evolution.painScale, session.painScale. " +
  `Operadores válidos: ${conditionOps.join(", ")}. ` +
  'Retorne APENAS um objeto JSON {"field": string, "op": operador, "value": valor}. ' +
  'Ex.: "se a dor for maior que 7" → {"field":"evolution.painScale","op":"gt","value":7}.';

export type NlCondition = { field: string; op: ConditionOp; value?: unknown };

/** Valida a saída do LLM numa condição {field, op, value}. Retorna null se inválida. */
export function coerceCondition(raw: unknown): NlCondition | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const field = typeof o.field === "string" ? o.field.trim() : "";
  const op = o.op as ConditionOp;
  if (!field) return null;
  if (!(conditionOps as readonly string[]).includes(op as string)) return null;
  return { field, op, ...(o.value !== undefined ? { value: o.value } : {}) };
}
