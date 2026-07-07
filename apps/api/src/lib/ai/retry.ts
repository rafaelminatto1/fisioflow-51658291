/**
 * Retry com backoff para chamadas de IA.
 *
 * O callAI já tem fallback ENTRE modelos, mas um soluço transitório (429/5xx/
 * rede) no modelo preferido derrubava direto pro fallback (modelo pior/mais
 * caro). Aqui re-tentamos o MESMO modelo em erros transitórios antes de cair no
 * fallback. Erros determinísticos (400, schema inválido) NÃO são re-tentados.
 *
 * Nota: o AI Gateway do Cloudflare também tem auto-retry no nível do gateway
 * (habilitável no dashboard). Este retry em código é defense-in-depth e cobre
 * também as chamadas que não passam pelo gateway.
 */

export function isTransientAIError(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /(?:\b(?:429|500|502|503|504)\b|timeout|timed out|econnreset|etimedout|fetch failed|network error|overloaded|rate.?limit|unavailable|temporarily|capacity|too many requests)/.test(
    m,
  );
}

export async function withAIRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseMs ?? 250;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isTransientAIError(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, baseMs * 2 ** attempt));
    }
  }
  throw lastErr;
}
