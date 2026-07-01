/**
 * Relatório de funil de conversão do CRM. Puro e testável — o endpoint agrupa as
 * conversas por estágio e passa as contagens aqui.
 */
export interface FunnelStageStat {
  stage: string;
  count: number;
  /** Percentual do total de conversas (para as barras). */
  pct: number;
}

export interface FunnelConversion {
  stages: FunnelStageStat[];
  total: number;
  /** % de conversas que chegaram ao último estágio do funil. */
  winRate: number;
}

export function computeFunnelConversion(
  counts: Record<string, number>,
  order: string[],
): FunnelConversion {
  const stages = order.map((stage) => ({ stage, count: counts[stage] ?? 0 }));
  const total = stages.reduce((sum, s) => sum + s.count, 0);
  const withPct: FunnelStageStat[] = stages.map((s) => ({
    ...s,
    pct: total ? Math.round((s.count / total) * 100) : 0,
  }));
  const reachedLast = stages[stages.length - 1]?.count ?? 0;
  const winRate = total ? Math.round((reachedLast / total) * 100) : 0;
  return { stages: withPct, total, winRate };
}
