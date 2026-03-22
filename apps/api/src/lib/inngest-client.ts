import type { Env } from '../types/env';

/**
 * Utilitário para disparar eventos para o Inngest sem o SDK.
 * Usado para manter o Worker leve e evitar conflitos de dependências.
 */
export async function triggerInngestEvent(
  env: Env,
  ctx: ExecutionContext,
  eventName: string,
  data: Record<string, any>,
  user?: { id?: string; email?: string }
) {
  const eventKey = env.INNGEST_EVENT_KEY;
  if (!eventKey) {
    console.warn('[Inngest] Event Key não configurada. Pulando evento:', eventName);
    return;
  }

  const endpoint = 'https://inn.gs/e/' + eventKey;

  const payload = {
    name: eventName,
    data,
    user: user || {},
    timestamp: Date.now(),
  };

  // Envia em segundo plano
  ctx.waitUntil(
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      if (!res.ok) {
        console.error('[Inngest] Falha ao disparar evento:', await res.text());
      }
    }).catch(err => {
      console.error('[Inngest] Erro de rede:', err);
    })
  );
}
