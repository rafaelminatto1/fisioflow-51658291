import { Hono } from 'hono';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { appointments, patientPackages } from '@fisioflow/db';
import { createDb, createPool, type DbPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

type FinancialApp = Hono<{ Bindings: Env; Variables: AuthVariables }>;
type CommandCenterPeriod = 'daily' | 'weekly' | 'monthly' | 'all';
type QueryRow = Record<string, unknown>;

const NO_SHOW_STATUSES = [
  'faltou',
  'faltou_com_aviso',
  'faltou_sem_aviso',
  'nao_atendido',
  'nao_atendido_sem_cobranca',
  'no_show',
];

const RECEIVABLE_ACCOUNT_TYPES = ['receber', 'receita'];
const PAYABLE_ACCOUNT_TYPES = ['pagar', 'despesa'];

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolvePeriod(period: string | undefined) {
  const normalized: CommandCenterPeriod =
    period === 'daily' || period === 'weekly' || period === 'monthly' || period === 'all'
      ? period
      : 'monthly';

  const now = startOfDay(new Date());
  const durationDays =
    normalized === 'daily' ? 1 : normalized === 'weekly' ? 7 : normalized === 'monthly' ? 30 : 180;

  const start = addDays(now, -(durationDays - 1));
  const end = now;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(durationDays - 1));

  return {
    key: normalized,
    label:
      normalized === 'daily'
        ? 'Hoje'
        : normalized === 'weekly'
          ? 'Últimos 7 dias'
          : normalized === 'monthly'
            ? 'Últimos 30 dias'
            : 'Últimos 180 dias',
    startDate: toYmd(start),
    endDate: toYmd(end),
    previousStartDate: toYmd(previousStart),
    previousEndDate: toYmd(previousEnd),
  };
}

function toNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function toInt(value: unknown) {
  return Math.round(toNumber(value));
}

function percentChange(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

async function queryRows<T extends QueryRow>(
  pool: DbPool,
  label: string,
  query: string,
  params: unknown[],
  fallback: T[] = [],
) {
  try {
    const result = await pool.query<T>(query, params);
    return result.rows ?? fallback;
  } catch (error) {
    console.error(`[FinancialAnalytics] ${label} failed`, error);
    return fallback;
  }
}

async function queryFirst<T extends QueryRow>(
  pool: DbPool,
  label: string,
  query: string,
  params: unknown[],
  fallback: T,
) {
  const rows = await queryRows<T>(pool, label, query, params, []);
  return rows[0] ?? fallback;
}

function buildAlerts(input: {
  overdueReceivablesCount: number;
  overdueAmount: number;
  pendingNfse: number;
  failedNfse: number;
  crmOverdueTasks: number;
  noShowRate: number;
}) {
  const alerts: Array<{
    id: string;
    title: string;
    description: string;
    tone: 'critical' | 'warning' | 'info';
    href: string;
  }> = [];

  if (input.overdueReceivablesCount > 0) {
    alerts.push({
      id: 'overdue-collections',
      title: 'Cobranças vencidas exigem ação',
      description: `${input.overdueReceivablesCount} cobranças vencidas somam R$ ${input.overdueAmount.toFixed(2)}.`,
      tone: 'critical',
      href: '/financial?tab=collections',
    });
  }

  if (input.failedNfse > 0) {
    alerts.push({
      id: 'nfse-errors',
      title: 'Erros em emissão fiscal',
      description: `${input.failedNfse} NFS-e com erro podem bloquear faturamento e fechamento.`,
      tone: 'critical',
      href: '/financeiro/nfse',
    });
  }

  if (input.pendingNfse > 0) {
    alerts.push({
      id: 'nfse-pending',
      title: 'Fila fiscal pendente',
      description: `${input.pendingNfse} documentos aguardam emissão ou autorização.`,
      tone: 'warning',
      href: '/financeiro/nfse',
    });
  }

  if (input.crmOverdueTasks > 0) {
    alerts.push({
      id: 'crm-overdue',
      title: 'CRM com follow-ups atrasados',
      description: `${input.crmOverdueTasks} tarefas estão vencidas e afetam conversão de receita.`,
      tone: 'warning',
      href: '/crm',
    });
  }

  if (input.noShowRate >= 0.12) {
    alerts.push({
      id: 'no-show',
      title: 'No-show acima do saudável',
      description: `A taxa recente de faltas está em ${(input.noShowRate * 100).toFixed(1)}%.`,
      tone: 'info',
      href: '/agenda',
    });
  }

  return alerts;
}

function buildSuggestions(input: {
  overdueReceivablesCount: number;
  projectedNext30Days: number;
  pendingPayables: number;
  referralRedemptions: number;
  activePatients: number;
  hotLeads: number;
  pendingNfse: number;
}) {
  const suggestions: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
  }> = [];

  if (input.overdueReceivablesCount > 0) {
    suggestions.push({
      id: 'prioritize-collections',
      title: 'Priorize a régua de cobrança',
      description: 'Ataque primeiro vencidos, depois os valores que vencem hoje, para destravar caixa mais rápido.',
      href: '/financial?tab=collections',
    });
  }

  if (input.pendingPayables > input.projectedNext30Days) {
    suggestions.push({
      id: 'protect-cash',
      title: 'Proteja o caixa dos próximos 30 dias',
      description: 'As saídas abertas superam a receita projetada. Reveja prazos e despesas antes do fechamento.',
      href: '/financial?tab=cashflow',
    });
  }

  if (input.referralRedemptions === 0 && input.activePatients >= 20) {
    suggestions.push({
      id: 'activate-referrals',
      title: 'Ative indicação de pacientes',
      description: 'A base já comporta um motor de referral e ainda não há conversões registradas no período.',
      href: '/marketing/referral',
    });
  }

  if (input.hotLeads > 0) {
    suggestions.push({
      id: 'hot-leads',
      title: 'Aproxime CRM do faturamento',
      description: `${input.hotLeads} leads estão em estágio quente. Transforme follow-up em previsão de receita.`,
      href: '/crm',
    });
  }

  if (input.pendingNfse > 0) {
    suggestions.push({
      id: 'fiscal-queue',
      title: 'Limpe a fila fiscal antes do fechamento',
      description: 'Emitir NFS-e pendentes reduz atrito no fechamento e melhora rastreabilidade documental.',
      href: '/financeiro/nfse',
    });
  }

  return suggestions;
}

export const registerFinancialAnalyticsRoutes = (app: FinancialApp) => {
  app.get('/command-center', requireAuth, async (c) => {
    const user = c.get('user');
    const range = resolvePeriod(c.req.query('period'));
    const pool = createPool(c.env);

    const transactionSummary = await queryFirst(
      pool,
      'transaction-summary',
      `SELECT
          COALESCE(SUM(CASE WHEN tipo = 'receita' AND COALESCE(status, 'pendente') IN ('pago', 'concluido') THEN valor ELSE 0 END), 0) AS realized_revenue,
          COALESCE(SUM(CASE WHEN tipo = 'despesa' AND COALESCE(status, 'pendente') IN ('pago', 'concluido') THEN valor ELSE 0 END), 0) AS realized_expenses,
          COUNT(*) FILTER (WHERE tipo = 'receita' AND COALESCE(status, 'pendente') IN ('pago', 'concluido'))::int AS realized_revenue_count,
          COUNT(*) FILTER (WHERE COALESCE(status, 'pendente') IN ('pago', 'concluido'))::int AS settled_count,
          COUNT(*)::int AS total_count
        FROM transacoes
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND created_at::date BETWEEN $2::date AND $3::date`,
      [user.organizationId, range.startDate, range.endDate],
      {
        realized_revenue: 0,
        realized_expenses: 0,
        realized_revenue_count: 0,
        settled_count: 0,
        total_count: 0,
      },
    );

    const previousRevenue = await queryFirst(
      pool,
      'previous-revenue',
      `SELECT
          COALESCE(SUM(CASE WHEN tipo = 'receita' AND COALESCE(status, 'pendente') IN ('pago', 'concluido') THEN valor ELSE 0 END), 0) AS realized_revenue
        FROM transacoes
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND created_at::date BETWEEN $2::date AND $3::date`,
      [user.organizationId, range.previousStartDate, range.previousEndDate],
      {
        realized_revenue: 0,
      },
    );

    const cashflowRows = await queryRows<{
      bucket: string;
      label: string;
      income: string | number;
      expense: string | number;
    }>(
      pool,
      'cashflow',
      `SELECT
          created_at::date::text AS bucket,
          TO_CHAR(created_at::date, 'DD/MM') AS label,
          COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS expense
        FROM transacoes
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND created_at::date BETWEEN $2::date AND $3::date
        GROUP BY created_at::date
        ORDER BY created_at::date ASC`,
      [user.organizationId, range.startDate, range.endDate],
      [],
    );

    const accountSummary = await queryFirst(
      pool,
      'account-summary',
      `SELECT
          COALESCE(SUM(CASE WHEN tipo IN ('receber', 'receita') AND status IN ('pendente', 'atrasado') THEN valor ELSE 0 END), 0) AS pending_receivables,
          COALESCE(SUM(CASE WHEN tipo IN ('pagar', 'despesa') AND status IN ('pendente', 'atrasado') THEN valor ELSE 0 END), 0) AS pending_payables,
          COALESCE(SUM(CASE WHEN tipo IN ('receber', 'receita') AND status IN ('pendente', 'atrasado') AND COALESCE(data_vencimento, created_at::date) < CURRENT_DATE THEN valor ELSE 0 END), 0) AS overdue_amount,
          COUNT(*) FILTER (
            WHERE tipo IN ('receber', 'receita')
              AND status IN ('pendente', 'atrasado')
              AND COALESCE(data_vencimento, created_at::date) < CURRENT_DATE
          )::int AS overdue_receivables_count,
          COUNT(*) FILTER (
            WHERE tipo IN ('receber', 'receita')
              AND status IN ('pendente', 'atrasado')
              AND COALESCE(data_vencimento, created_at::date) = CURRENT_DATE
          )::int AS due_today_count
        FROM contas_financeiras
        WHERE organization_id = $1
          AND deleted_at IS NULL`,
      [user.organizationId],
      {
        pending_receivables: 0,
        pending_payables: 0,
        overdue_amount: 0,
        overdue_receivables_count: 0,
        due_today_count: 0,
      },
    );

    const topAccounts = await queryRows<{
      id: string;
      tipo: string;
      description: string;
      status: string;
      amount: string | number;
      due_date: string;
      patient_id: string | null;
      patient_name: string;
    }>(
      pool,
      'top-accounts',
      `SELECT
          cf.id::text AS id,
          cf.tipo AS tipo,
          COALESCE(cf.descricao, 'Sem descrição') AS description,
          cf.status AS status,
          COALESCE(cf.valor, 0) AS amount,
          COALESCE(cf.data_vencimento, cf.created_at::date)::text AS due_date,
          cf.patient_id::text AS patient_id,
          COALESCE(p.full_name, 'Sem vínculo de paciente') AS patient_name
        FROM contas_financeiras cf
        LEFT JOIN patients p ON p.id = cf.patient_id
        WHERE cf.organization_id = $1
          AND cf.deleted_at IS NULL
          AND cf.tipo IN ('receber', 'receita')
          AND cf.status IN ('pendente', 'atrasado')
        ORDER BY
          CASE
            WHEN COALESCE(cf.data_vencimento, cf.created_at::date) < CURRENT_DATE THEN 0
            WHEN COALESCE(cf.data_vencimento, cf.created_at::date) = CURRENT_DATE THEN 1
            ELSE 2
          END,
          COALESCE(cf.data_vencimento, cf.created_at::date) ASC,
          cf.valor DESC
        LIMIT 6`,
      [user.organizationId],
      [],
    );

    const todayCollections = await queryRows<{
      id: string;
      tipo: string;
      description: string;
      status: string;
      amount: string | number;
      due_date: string;
      patient_id: string | null;
      patient_name: string;
    }>(
      pool,
      'today-collections',
      `SELECT
          cf.id::text AS id,
          cf.tipo AS tipo,
          COALESCE(cf.descricao, 'Sem descrição') AS description,
          cf.status AS status,
          COALESCE(cf.valor, 0) AS amount,
          COALESCE(cf.data_vencimento, cf.created_at::date)::text AS due_date,
          cf.patient_id::text AS patient_id,
          COALESCE(p.full_name, 'Sem vínculo de paciente') AS patient_name
        FROM contas_financeiras cf
        LEFT JOIN patients p ON p.id = cf.patient_id
        WHERE cf.organization_id = $1
          AND cf.deleted_at IS NULL
          AND cf.tipo IN ('receber', 'receita')
          AND cf.status IN ('pendente', 'atrasado')
          AND COALESCE(cf.data_vencimento, cf.created_at::date) <= CURRENT_DATE
        ORDER BY
          COALESCE(cf.data_vencimento, cf.created_at::date) ASC,
          cf.valor DESC
        LIMIT 5`,
      [user.organizationId],
      [],
    );

    const recentTransactions = await queryRows<{
      id: string;
      tipo: string;
      description: string;
      status: string;
      amount: string | number;
      created_at: string;
    }>(
      pool,
      'recent-transactions',
      `SELECT
          id::text AS id,
          tipo,
          COALESCE(descricao, 'Sem descrição') AS description,
          COALESCE(status, 'pendente') AS status,
          COALESCE(valor, 0) AS amount,
          created_at::text AS created_at
        FROM transacoes
        WHERE organization_id = $1
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 8`,
      [user.organizationId],
      [],
    );

    const appointmentMetrics = await queryFirst(
      pool,
      'appointment-metrics',
      `SELECT
          COUNT(*) FILTER (WHERE status::text = 'atendido')::int AS completed_sessions,
          COALESCE(SUM(CASE WHEN status::text = 'atendido' THEN payment_amount ELSE 0 END), 0) AS completed_revenue,
          COALESCE(AVG(CASE WHEN status::text = 'atendido' THEN payment_amount END), 0) AS average_ticket,
          COUNT(*) FILTER (
            WHERE status::text IN (
              'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
              'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show'
            )
          )::int AS no_show_count,
          COUNT(*)::int AS total_sessions
        FROM appointments
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND date BETWEEN $2::date AND $3::date`,
      [user.organizationId, range.startDate, range.endDate],
      {
        completed_sessions: 0,
        completed_revenue: 0,
        average_ticket: 0,
        no_show_count: 0,
        total_sessions: 0,
      },
    );

    const scheduleMetrics = await queryFirst(
      pool,
      'schedule-metrics',
      `SELECT
          COUNT(*) FILTER (
            WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days'
              AND status::text NOT IN (
                'cancelado', 'cancelled',
                'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
                'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show',
                'remarcar', 'remarcado', 'rescheduled'
              )
          )::int AS scheduled_next_7d,
          COUNT(*) FILTER (
            WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '29 days'
              AND status::text NOT IN (
                'cancelado', 'cancelled',
                'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
                'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show',
                'remarcar', 'remarcado', 'rescheduled'
              )
          )::int AS scheduled_next_30d,
          COALESCE(SUM(
            CASE
              WHEN date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '29 days'
                AND status::text NOT IN (
                  'cancelado', 'cancelled',
                  'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
                  'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show',
                  'remarcar', 'remarcado', 'rescheduled'
                )
              THEN payment_amount
              ELSE 0
            END
          ), 0) AS expected_revenue_next_30d
        FROM appointments
        WHERE organization_id = $1
          AND deleted_at IS NULL`,
      [user.organizationId],
      {
        scheduled_next_7d: 0,
        scheduled_next_30d: 0,
        expected_revenue_next_30d: 0,
      },
    );

    const noShowRateMetrics = await queryFirst(
      pool,
      'no-show-rate',
      `SELECT
          (
            COUNT(
              CASE
                WHEN status::text IN (
                  'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
                  'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show'
                ) THEN 1
              END
            )::float / NULLIF(COUNT(*), 0)
          ) AS rate
        FROM appointments
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND date < CURRENT_DATE
          AND date >= CURRENT_DATE - INTERVAL '90 days'`,
      [user.organizationId],
      {
        rate: 0,
      },
    );

    const patientSummary = await queryFirst(
      pool,
      'patient-summary',
      `SELECT
          COUNT(*) FILTER (WHERE COALESCE(is_active, true) = true)::int AS active_patients,
          COUNT(*) FILTER (WHERE created_at::date BETWEEN $2::date AND $3::date)::int AS new_patients,
          COUNT(*) FILTER (
            WHERE created_at::date BETWEEN $2::date AND $3::date
              AND (
                status = 'ativo'
                OR LOWER(COALESCE(status, '')) = 'active'
                OR COALESCE(is_active, false) = true
              )
          )::int AS converted_patients
        FROM patients
        WHERE organization_id = $1
          AND deleted_at IS NULL`,
      [user.organizationId, range.startDate, range.endDate],
      {
        active_patients: 0,
        new_patients: 0,
        converted_patients: 0,
      },
    );

    const riskPatients = await queryRows<{
      id: string;
      full_name: string;
      phone: string;
      last_appointment: string | null;
      open_amount: string | number;
      missed_count: string | number;
    }>(
      pool,
      'risk-patients',
      `SELECT
          p.id::text AS id,
          p.full_name AS full_name,
          COALESCE(p.phone, '') AS phone,
          COALESCE(MAX(a.date)::text, null) AS last_appointment,
          COALESCE(SUM(
            CASE
              WHEN cf.status IN ('pendente', 'atrasado') AND cf.tipo IN ('receber', 'receita') THEN cf.valor
              ELSE 0
            END
          ), 0) AS open_amount,
          COUNT(
            CASE
              WHEN a.status::text IN (
                'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
                'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show'
              ) THEN 1
            END
          )::int AS missed_count
        FROM patients p
        LEFT JOIN contas_financeiras cf
          ON cf.patient_id = p.id
          AND cf.organization_id = p.organization_id
          AND cf.deleted_at IS NULL
        LEFT JOIN appointments a
          ON a.patient_id = p.id
          AND a.organization_id = p.organization_id
          AND a.deleted_at IS NULL
        WHERE p.organization_id = $1
          AND p.deleted_at IS NULL
          AND COALESCE(p.is_active, true) = true
        GROUP BY p.id, p.full_name, p.phone
        HAVING
          COALESCE(SUM(
            CASE
              WHEN cf.status IN ('pendente', 'atrasado') AND cf.tipo IN ('receber', 'receita') THEN cf.valor
              ELSE 0
            END
          ), 0) > 0
          OR COUNT(
            CASE
              WHEN a.status::text IN (
                'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
                'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show'
              ) THEN 1
            END
          ) > 0
        ORDER BY open_amount DESC, missed_count DESC, MAX(a.date) ASC NULLS FIRST
        LIMIT 5`,
      [user.organizationId],
      [],
    );

    const crmSummary = await queryFirst(
      pool,
      'crm-summary',
      `SELECT
          COUNT(*)::int AS total_leads,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(estagio, '')) NOT IN ('convertido', 'ganho', 'perdido', 'cancelado', 'arquivado')
          )::int AS pipeline_leads,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(estagio, '')) IN ('negociacao', 'proposta', 'qualificacao', 'quente', 'hot')
          )::int AS hot_leads
        FROM leads
        WHERE organization_id = $1`,
      [user.organizationId],
      {
        total_leads: 0,
        pipeline_leads: 0,
        hot_leads: 0,
      },
    );

    const crmTopStage = await queryFirst(
      pool,
      'crm-top-stage',
      `SELECT
          COALESCE(estagio, 'Sem estágio') AS stage,
          COUNT(*)::int AS total
        FROM leads
        WHERE organization_id = $1
        GROUP BY COALESCE(estagio, 'Sem estágio')
        ORDER BY total DESC
        LIMIT 1`,
      [user.organizationId],
      {
        stage: 'Sem estágio',
        total: 0,
      },
    );

    const crmTasks = await queryFirst(
      pool,
      'crm-tasks',
      `SELECT
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(status, 'pendente')) NOT IN ('concluida', 'concluido', 'done')
          )::int AS open_tasks,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(status, 'pendente')) NOT IN ('concluida', 'concluido', 'done')
              AND due_date < CURRENT_DATE
          )::int AS overdue_tasks
        FROM crm_tarefas
        WHERE organization_id = $1`,
      [user.organizationId],
      {
        open_tasks: 0,
        overdue_tasks: 0,
      },
    );

    const crmCampaigns = await queryFirst(
      pool,
      'crm-campaigns',
      `SELECT
          COUNT(*) FILTER (WHERE created_at::date BETWEEN $2::date AND $3::date)::int AS campaigns_in_period
        FROM crm_campanhas
        WHERE organization_id = $1`,
      [user.organizationId, range.startDate, range.endDate],
      {
        campaigns_in_period: 0,
      },
    );

    const marketingSummary = await queryFirst(
      pool,
      'marketing-summary',
      `SELECT
          COUNT(*) FILTER (WHERE enabled = true AND COALESCE(deleted, false) = false)::int AS recall_active
        FROM marketing_recall_campaigns
        WHERE organization_id = $1`,
      [user.organizationId],
      {
        recall_active: 0,
      },
    );

    const referralSummary = await queryFirst(
      pool,
      'referral-summary',
      `SELECT
          COUNT(*)::int AS redemptions_in_period
        FROM referral_redemptions
        WHERE organization_id = $1
          AND redeemed_at::date BETWEEN $2::date AND $3::date`,
      [user.organizationId, range.startDate, range.endDate],
      {
        redemptions_in_period: 0,
      },
    );

    const documentsSummary = await queryFirst(
      pool,
      'documents-summary',
      `SELECT
          COUNT(*) FILTER (WHERE status IN ('rascunho', 'enviado'))::int AS pending_nfse,
          COUNT(*) FILTER (WHERE status = 'autorizado')::int AS authorized_nfse,
          COUNT(*) FILTER (WHERE status = 'erro')::int AS failed_nfse
        FROM nfse
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND data_emissao::date BETWEEN $2::date AND $3::date`,
      [user.organizationId, range.startDate, range.endDate],
      {
        pending_nfse: 0,
        authorized_nfse: 0,
        failed_nfse: 0,
      },
    );

    const receiptsSummary = await queryFirst(
      pool,
      'receipts-summary',
      `SELECT
          COUNT(*) FILTER (WHERE created_at::date BETWEEN $2::date AND $3::date)::int AS receipts_in_period,
          COALESCE(MAX(numero_recibo), 0)::int AS last_receipt_number
        FROM recibos
        WHERE organization_id = $1`,
      [user.organizationId, range.startDate, range.endDate],
      {
        receipts_in_period: 0,
        last_receipt_number: 0,
      },
    );

    const realizedRevenue = toNumber(transactionSummary.realized_revenue);
    const realizedExpenses = toNumber(transactionSummary.realized_expenses);
    const previousRealizedRevenue = toNumber(previousRevenue.realized_revenue);
    const averageTicket =
      toNumber(appointmentMetrics.average_ticket) ||
      (toInt(transactionSummary.realized_revenue_count) > 0
        ? realizedRevenue / toInt(transactionSummary.realized_revenue_count)
        : 0);
    const noShowRate = toNumber(noShowRateMetrics.rate);
    const projectedNext30Days =
      toNumber(scheduleMetrics.expected_revenue_next_30d) * (1 - noShowRate);

    let runningBalance = 0;
    const cashflowPoints = cashflowRows.map((row) => {
      const income = toNumber(row.income);
      const expense = toNumber(row.expense);
      runningBalance += income - expense;

      return {
        date: String(row.bucket ?? ''),
        label: String(row.label ?? ''),
        income,
        expense,
        balance: runningBalance,
      };
    });

    const alerts = buildAlerts({
      overdueReceivablesCount: toInt(accountSummary.overdue_receivables_count),
      overdueAmount: toNumber(accountSummary.overdue_amount),
      pendingNfse: toInt(documentsSummary.pending_nfse),
      failedNfse: toInt(documentsSummary.failed_nfse),
      crmOverdueTasks: toInt(crmTasks.overdue_tasks),
      noShowRate,
    });

    const suggestions = buildSuggestions({
      overdueReceivablesCount: toInt(accountSummary.overdue_receivables_count),
      projectedNext30Days,
      pendingPayables: toNumber(accountSummary.pending_payables),
      referralRedemptions: toInt(referralSummary.redemptions_in_period),
      activePatients: toInt(patientSummary.active_patients),
      hotLeads: toInt(crmSummary.hot_leads),
      pendingNfse: toInt(documentsSummary.pending_nfse),
    });

    return c.json({
      data: {
        period: range,
        summary: {
          realizedRevenue,
          realizedExpenses,
          netBalance: realizedRevenue - realizedExpenses,
          pendingReceivables: toNumber(accountSummary.pending_receivables),
          pendingPayables: toNumber(accountSummary.pending_payables),
          overdueAmount: toNumber(accountSummary.overdue_amount),
          averageTicket,
          collectionRate: toInt(transactionSummary.total_count)
            ? (toInt(transactionSummary.settled_count) / toInt(transactionSummary.total_count)) * 100
            : 0,
          monthlyGrowth: percentChange(realizedRevenue, previousRealizedRevenue),
          activePatients: toInt(patientSummary.active_patients),
          projectedNext30Days,
        },
        cashflow: {
          points: cashflowPoints,
          totals: {
            income: cashflowPoints.reduce((sum, point) => sum + point.income, 0),
            expense: cashflowPoints.reduce((sum, point) => sum + point.expense, 0),
            balance: cashflowPoints.length ? cashflowPoints[cashflowPoints.length - 1].balance : 0,
          },
        },
        collections: {
          overdueCount: toInt(accountSummary.overdue_receivables_count),
          dueTodayCount: toInt(accountSummary.due_today_count),
          topAccounts: topAccounts.map((row) => ({
            id: String(row.id ?? ''),
            tipo: String(row.tipo ?? 'receita'),
            description: String(row.description ?? 'Sem descrição'),
            status: String(row.status ?? 'pendente'),
            amount: toNumber(row.amount),
            dueDate: String(row.due_date ?? ''),
            patientId: row.patient_id ? String(row.patient_id) : null,
            patientName: String(row.patient_name ?? 'Sem vínculo de paciente'),
          })),
        },
        documents: {
          receiptsInPeriod: toInt(receiptsSummary.receipts_in_period),
          lastReceiptNumber: toInt(receiptsSummary.last_receipt_number),
          pendingNfse: toInt(documentsSummary.pending_nfse),
          authorizedNfse: toInt(documentsSummary.authorized_nfse),
          failedNfse: toInt(documentsSummary.failed_nfse),
        },
        integrations: {
          patients: {
            activeCount: toInt(patientSummary.active_patients),
            newPatients: toInt(patientSummary.new_patients),
            convertedPatients: toInt(patientSummary.converted_patients),
            riskPatients: riskPatients.map((row) => ({
              id: String(row.id ?? ''),
              fullName: String(row.full_name ?? 'Paciente'),
              phone: String(row.phone ?? ''),
              lastAppointment: row.last_appointment ? String(row.last_appointment) : null,
              openAmount: toNumber(row.open_amount),
              missedCount: toInt(row.missed_count),
            })),
          },
          crm: {
            totalLeads: toInt(crmSummary.total_leads),
            pipelineLeads: toInt(crmSummary.pipeline_leads),
            hotLeads: toInt(crmSummary.hot_leads),
            openTasks: toInt(crmTasks.open_tasks),
            overdueTasks: toInt(crmTasks.overdue_tasks),
            topStage: {
              name: String(crmTopStage.stage ?? 'Sem estágio'),
              total: toInt(crmTopStage.total),
            },
            campaignsInPeriod: toInt(crmCampaigns.campaigns_in_period),
          },
          marketing: {
            recallActive: toInt(marketingSummary.recall_active),
            referralRedemptions: toInt(referralSummary.redemptions_in_period),
            convertedLeads: toInt(patientSummary.converted_patients),
            newPatientsInPeriod: toInt(patientSummary.new_patients),
          },
          schedule: {
            completedSessions: toInt(appointmentMetrics.completed_sessions),
            scheduledNext7Days: toInt(scheduleMetrics.scheduled_next_7d),
            scheduledNext30Days: toInt(scheduleMetrics.scheduled_next_30d),
            expectedRevenueNext30Days: toNumber(scheduleMetrics.expected_revenue_next_30d),
            noShowRate90d: noShowRate,
          },
        },
        recentTransactions: recentTransactions.map((row) => ({
          id: String(row.id ?? ''),
          tipo: String(row.tipo ?? 'receita'),
          description: String(row.description ?? 'Sem descrição'),
          status: String(row.status ?? 'pendente'),
          amount: toNumber(row.amount),
          createdAt: String(row.created_at ?? ''),
        })),
        alerts,
        suggestions,
      },
    });
  });

  app.get('/prediction', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    const [futureSchedule] = await db.select({
      expectedRevenue: sql<number>`COALESCE(SUM(${appointments.paymentAmount}), 0)`,
      sessionCount: sql<number>`COUNT(*)`
    })
    .from(appointments)
    .where(and(
      eq(appointments.organizationId, user.organizationId),
      gte(appointments.date, sql`CURRENT_DATE`),
      lte(appointments.date, sql`CURRENT_DATE + INTERVAL '30 days'`),
      sql`${appointments.status}::text NOT IN (
        'cancelado', 'cancelled',
        'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
        'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show'
      )`
    ));

    const [packagesBaseline] = await db.select({
      inventoryValue: sql<number>`COALESCE(SUM(${patientPackages.remainingSessions} * (${patientPackages.price} / NULLIF(${patientPackages.totalSessions}, 0))), 0)`
    })
    .from(patientPackages)
    .where(and(
      eq(patientPackages.organizationId, user.organizationId),
      eq(patientPackages.status, 'active')
    ));

    const [noShowRate] = await db.select({
      rate: sql<number>`(
        COUNT(
          CASE
            WHEN ${appointments.status}::text IN (
              'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
              'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show'
            ) THEN 1
          END
        )::float / NULLIF(COUNT(*), 0)
      )`
    })
    .from(appointments)
    .where(and(
      eq(appointments.organizationId, user.organizationId),
      sql`${appointments.date} < CURRENT_DATE`,
      sql`${appointments.date} >= CURRENT_DATE - INTERVAL '90 days'`
    ));

    const rawExpected = Number(futureSchedule?.expectedRevenue || 0);
    const rate = Number(noShowRate?.rate || 0.1);

    return c.json({
      data: {
        next30Days: {
          raw: rawExpected,
          adjusted: rawExpected * (1 - rate),
          sessions: Number(futureSchedule?.sessionCount || 0),
          confidence: 0.85
        },
        inventory: {
          packageValue: Number(packagesBaseline?.inventoryValue || 0)
        },
        historicalMetrics: {
          noShowRate: rate
        }
      }
    });
  });

  app.get('/card-mapping/:digits', requireAuth, async (c) => {
    const user = c.get('user');
    const digits = c.req.param('digits').replace(/\D/g, '').slice(-4);
    if (digits.length !== 4) return c.json({ data: null });

    const pool = createPool(c.env);
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS card_patient_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id TEXT NOT NULL,
        card_digits CHAR(4) NOT NULL,
        patient_id UUID NOT NULL,
        patient_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(organization_id, card_digits)
      )`);
      const res = await pool.query(
        `SELECT patient_id, patient_name FROM card_patient_mappings WHERE organization_id = $1 AND card_digits = $2`,
        [user.organizationId, digits]
      );
      return c.json({ data: res.rows[0] ?? null });
    } catch {
      return c.json({ data: null });
    }
  });

  app.post('/card-mapping', requireAuth, async (c) => {
    const user = c.get('user');
    const body = await c.req.json() as { patientId: string; cardLastDigits: string; patientName?: string };
    const digits = String(body.cardLastDigits ?? '').replace(/\D/g, '').slice(-4);

    if (!body.patientId || digits.length !== 4) {
      return c.json({ error: 'patientId e cardLastDigits (4 dígitos) são obrigatórios' }, 400);
    }

    const pool = createPool(c.env);
    try {
      await pool.query(
        `INSERT INTO card_patient_mappings (organization_id, card_digits, patient_id, patient_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (organization_id, card_digits) DO UPDATE SET patient_id = EXCLUDED.patient_id, patient_name = EXCLUDED.patient_name`,
        [user.organizationId, digits, body.patientId, body.patientName ?? null]
      );
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ error: 'Erro ao salvar mapeamento', details: err.message }, 500);
    }
  });
};
