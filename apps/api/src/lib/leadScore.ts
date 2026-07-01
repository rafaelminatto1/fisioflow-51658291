/**
 * Lead scoring híbrido (0–100): regras determinísticas (estágio, engajamento,
 * recência, origem) + bônus pela intenção detectada pelo concierge.
 * Função pura e testável — o writer (cron/ingestão) coleta os sinais e persiste.
 */
export interface LeadScoreSignals {
  /** Estágio do funil (crm_lead_stage) ou lifecycle_stage. */
  stage?: string | null;
  /** Origem/canal do lead. */
  origin?: string | null;
  /** Nº de mensagens trocadas na conversa. */
  messageCount?: number | null;
  /** Timestamp da última mensagem recebida do contato. */
  lastInboundAt?: string | Date | null;
  /** Intenção do concierge: scheduling | urgent | information | other. */
  intent?: string | null;
  /** Injeção de "agora" para testes. */
  now?: Date;
}

function stageScore(stage?: string | null): number {
  const s = (stage ?? "").toLowerCase();
  if (!s) return 8;
  if (/(alta|churn|perdid)/.test(s)) return 90;
  if (/(efetivad|treatment|customer|tratamento)/.test(s)) return 80;
  if (/(avalia|evaluation|sql|opportunity)/.test(s)) return 50;
  if (/(contato|contact|mql|aguard)/.test(s)) return 25;
  if (/(lead|novo|new)/.test(s)) return 10;
  return 12;
}

function recencyBonus(lastInboundAt: string | Date | null | undefined, now: Date): number {
  if (!lastInboundAt) return 0;
  const t = new Date(lastInboundAt).getTime();
  if (Number.isNaN(t)) return 0;
  const hours = (now.getTime() - t) / 3_600_000;
  if (hours <= 24) return 20;
  if (hours <= 72) return 10;
  if (hours <= 168) return 5;
  return 0;
}

function intentBonus(intent?: string | null): number {
  switch ((intent ?? "").toLowerCase()) {
    case "urgent":
      return 20;
    case "scheduling":
      return 15;
    case "information":
      return 5;
    default:
      return 0;
  }
}

function originBonus(origin?: string | null): number {
  const o = (origin ?? "").toLowerCase();
  return /(ads|pago|paid|meta|instagram|facebook|google)/.test(o) ? 5 : 0;
}

export function computeLeadScore(signals: LeadScoreSignals): number {
  const now = signals.now ?? new Date();
  const engagement = Math.min(Math.max(signals.messageCount ?? 0, 0), 10) * 1.5; // teto 15
  const raw =
    stageScore(signals.stage) * 0.55 + // peso do estágio
    engagement +
    recencyBonus(signals.lastInboundAt, now) +
    intentBonus(signals.intent) +
    originBonus(signals.origin);
  return Math.max(0, Math.min(100, Math.round(raw)));
}
