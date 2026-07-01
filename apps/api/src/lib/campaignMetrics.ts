/**
 * Helpers de campanhas: seletor de campanhas agendadas "vencidas" e resumo de
 * entregas/leituras por status dos envios. Puro e testável.
 */
export function isCampaignDue(
  campaign: { status?: string | null; agendada_em?: string | Date | null },
  now: Date = new Date(),
): boolean {
  if (campaign.status !== "agendada" || !campaign.agendada_em) return false;
  const t = new Date(campaign.agendada_em).getTime();
  if (Number.isNaN(t)) return false;
  return t <= now.getTime();
}

export interface EnvioSummary {
  total: number;
  enviados: number;
  entregues: number;
  lidos: number;
  falhas: number;
}

export function summarizeEnvios(rows: Array<{ status?: string | null }>): EnvioSummary {
  const out: EnvioSummary = { total: 0, enviados: 0, entregues: 0, lidos: 0, falhas: 0 };
  for (const r of rows) {
    out.total++;
    switch ((r.status ?? "").toLowerCase()) {
      case "lido":
      case "read":
        out.lidos++;
        break;
      case "entregue":
      case "delivered":
        out.entregues++;
        break;
      case "falha":
      case "failed":
      case "erro":
        out.falhas++;
        break;
      default:
        out.enviados++;
    }
  }
  return out;
}
