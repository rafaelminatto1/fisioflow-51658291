/**
 * Utilitário centralizado para ingestão de logs de debug do agente.
 * DESABILITADO - Removido para produção.
 *
 * @module lib/debug/agentIngest
 */

export interface AgentIngestPayload {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  sessionId?: string;
  hypothesisId?: string;
}

/**
 * NO-OP: Função desabilitada para produção.
 * Antes enviava logs para servidor de debug local.
 */
export function agentIngest(_payload: AgentIngestPayload): void {
  // No-op: desabilitado para produção
}
