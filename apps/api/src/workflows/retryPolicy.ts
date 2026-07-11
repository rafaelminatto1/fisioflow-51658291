/**
 * Retry dinâmico para steps de Workflow que chamam APIs externas (Meta Graph, prefeitura).
 *
 * Why: Workflows suporta `retries.delay` como função desde 2026-07-09 — em rate limit
 * (429) esperamos mais (respeitando Retry-After quando presente); em falha transitória
 * de rede o backoff exponencial curto resolve. Antes disso, delays fixos faziam o step
 * re-bater na API ainda dentro da janela de throttle.
 */

import type { WorkflowStepConfig } from "cloudflare:workers";

const RATE_LIMIT_RE = /429|rate limit|too many requests/i;
const RETRY_AFTER_RE = /retry-after:\s*(\d+)/i;

export function computeRetryDelay(attempt: number, error: { message?: string } | undefined): string {
  const msg = error?.message ?? "";
  if (RATE_LIMIT_RE.test(msg)) {
    const retryAfter = Number(msg.match(RETRY_AFTER_RE)?.[1] ?? 0);
    return `${Math.max(retryAfter, attempt * 60)} seconds`;
  }
  return `${Math.min(10 * 2 ** (attempt - 1), 600)} seconds`;
}

/**
 * Config de retries para `step.do` com delay dinâmico rate-limit-aware.
 * Cast necessário: @cloudflare/workers-types 4.20260609 ainda não tipa `delay` como
 * função (runtime suporta desde 2026-07-09) — remover o cast ao atualizar os types.
 */
export function apiRetries(limit = 4) {
  return {
    limit,
    delay: ({ ctx, error }: { ctx: { attempt: number }; error: Error }) =>
      computeRetryDelay(ctx.attempt, error),
  } as unknown as NonNullable<WorkflowStepConfig["retries"]>;
}

/**
 * Converte resposta de erro da Meta em exceção com status + Retry-After na mensagem,
 * para o delay dinâmico do step conseguir reagir. Sem isso a falha morre em console.error
 * e o Workflow marca o step como sucesso.
 */
export async function throwIfMetaError(res: Response, stepLabel: string): Promise<void> {
  if (res.ok) return;
  const retryAfter = res.headers.get("Retry-After");
  const body = await res.text().catch(() => "");
  throw new Error(
    `[${stepLabel}] Meta API ${res.status}${retryAfter ? ` (retry-after: ${retryAfter})` : ""}: ${body.slice(0, 300)}`,
  );
}
