/**
 * Roteamento automático de conversas para atendentes.
 * Função pura e testável — o caller resolve a lista de agentes + carga atual e
 * persiste a atribuição. Gated por organizations.settings.crm_whatsapp.routing.
 */
export type RoutingStrategy = "round_robin" | "least_busy";

export interface AgentLoad {
  id: string;
  openCount: number;
}

/**
 * Escolhe o próximo atendente.
 * - least_busy: menor nº de conversas abertas (desempate estável por id).
 * - round_robin: próximo agente (ordem estável por id) após `lastAssignedId`.
 */
export function pickNextAssignee(
  agents: AgentLoad[],
  strategy: RoutingStrategy,
  lastAssignedId?: string | null,
): string | null {
  if (agents.length === 0) return null;
  const sorted = [...agents].sort((a, b) => a.id.localeCompare(b.id));

  if (strategy === "least_busy") {
    return [...sorted].sort((a, b) => a.openCount - b.openCount)[0].id;
  }

  // round_robin
  if (!lastAssignedId) return sorted[0].id;
  const idx = sorted.findIndex((a) => a.id === lastAssignedId);
  if (idx === -1) return sorted[0].id;
  return sorted[(idx + 1) % sorted.length].id;
}
