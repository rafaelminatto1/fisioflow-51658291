/**
 * Utilitário centralizado para ingestão de logs de debug do agente.
 * Usado apenas em desenvolvimento para debugging com Cursor/agentes.
 *
 * Para habilitar: definir VITE_DEBUG_AGENT_INGEST=true no .env.local
 * Para desabilitar: remover a variável ou definir como false
 *
 * @module lib/debug/agentIngest
 */

const DEBUG_INGEST_URL = 'http://127.0.0.1:7242/ingest/3f007de9-e51e-4db7-b86b-110485f7b6de';

/** Verifica se o debug ingest está habilitado (DEV + flag explícita) */
function isAgentIngestEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEBUG_AGENT_INGEST === 'true' &&
    typeof fetch !== 'undefined'
  );
}

export interface AgentIngestPayload {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  sessionId?: string;
  hypothesisId?: string;
}

/**
 * Envia log estruturado para o agente de debug (fire-and-forget).
 * Não bloqueia a execução e falha silenciosamente.
 */
export function agentIngest(payload: AgentIngestPayload): void {
  if (!isAgentIngestEnabled()) return;

  const body = {
    ...payload,
    timestamp: payload.timestamp ?? Date.now(),
    sessionId: payload.sessionId ?? 'debug-session',
  };

  fetch(DEBUG_INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {
    // Ignora erros de rede (agente pode não estar rodando)
  });
}
