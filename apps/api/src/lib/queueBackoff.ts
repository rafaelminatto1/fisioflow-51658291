/** Backoff exponencial (segundos) para retry de mensagens da fila, por tentativa. */
export function backoffDelay(attempts: number): number {
  const n = Math.max(1, attempts);
  return Math.min(2 ** n * 5, 300);
}
