import { neon } from "@neondatabase/serverless";
import type { Env } from "../types/env";
import { estimateTranscriptionMinutes } from "@fisioflow/core";

export type TranscriptionBudgetCheck = {
  configured: boolean;
  allowed: boolean;
  scope: "organization" | "professional" | "none";
  reason?: string;
  organization: BudgetUsage;
  professional?: BudgetUsage;
};

export type BudgetUsage = {
  limitMinutes: number;
  usedMinutes: number;
  requestedMinutes: number;
  projectedMinutes: number;
  remainingMinutes: number;
  warnAtPercent: number;
  hardStop: boolean;
  warning: boolean;
};

type BudgetRow = {
  monthly_limit_minutes: number;
  warn_at_percent: number;
  hard_stop: boolean;
};

const DEFAULT_ORG_LIMIT_MINUTES = 1200;

export async function checkAudioTranscriptionBudget(
  env: Env,
  input: {
    organizationId: string;
    professionalUserId?: string | null;
    requestedSeconds: number;
  },
): Promise<TranscriptionBudgetCheck> {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString;
  if (!url) return buildFallbackCheck(input.requestedSeconds, "no-db-url");

  const sql = neon(url);
  const requestedMinutes = estimateTranscriptionMinutes(input.requestedSeconds);

  try {
    const [orgBudget, proBudget, usage] = await Promise.all([
      sql`
        SELECT monthly_limit_minutes, warn_at_percent, hard_stop
        FROM audio_transcription_budgets
        WHERE organization_id = ${input.organizationId}
          AND professional_user_id IS NULL
        ORDER BY effective_from DESC
        LIMIT 1
      `,
      input.professionalUserId
        ? sql`
            SELECT monthly_limit_minutes, warn_at_percent, hard_stop
            FROM audio_transcription_budgets
            WHERE organization_id = ${input.organizationId}
              AND professional_user_id = ${input.professionalUserId}
            ORDER BY effective_from DESC
            LIMIT 1
          `
        : Promise.resolve([]),
      sql`
        SELECT
          COALESCE(SUM(captured_seconds), 0)::integer AS org_seconds,
          COALESCE(
            SUM(captured_seconds) FILTER (WHERE therapist_id = ${input.professionalUserId ?? ""}),
            0
          )::integer AS professional_seconds
        FROM clinical_scribe_logs
        WHERE organization_id = ${input.organizationId}
          AND created_at >= date_trunc('month', now())
      `,
    ]);

    const orgBudgetRows = orgBudget as BudgetRow[];
    const proBudgetRows = proBudget as BudgetRow[];
    const usageRows = usage as Array<{ org_seconds: number; professional_seconds: number }>;
    const org = buildUsage(
      orgBudgetRows[0] ?? {
        monthly_limit_minutes: DEFAULT_ORG_LIMIT_MINUTES,
        warn_at_percent: 80,
        hard_stop: true,
      },
      Number(usageRows[0]?.org_seconds ?? 0),
      requestedMinutes,
    );

    const professional = proBudgetRows[0]
      ? buildUsage(proBudgetRows[0], Number(usageRows[0]?.professional_seconds ?? 0), requestedMinutes)
      : undefined;

    const blockingScope =
      org.hardStop && org.projectedMinutes > org.limitMinutes
        ? "organization"
        : professional?.hardStop && professional.projectedMinutes > professional.limitMinutes
          ? "professional"
          : undefined;

    return {
      configured: true,
      allowed: !blockingScope,
      scope: professional ? "professional" : "organization",
      reason: blockingScope ? `${blockingScope}_monthly_transcription_budget_exceeded` : undefined,
      organization: org,
      professional,
    };
  } catch (error) {
    console.warn("[AudioBudget] Budget check failed; allowing transcription:", error);
    return buildFallbackCheck(input.requestedSeconds, "budget-check-unavailable");
  }
}

export async function listAudioTranscriptionBudgets(
  env: Env,
  organizationId: string,
): Promise<Array<BudgetRow & { id: string; professional_user_id: string | null; updated_at: string }>> {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString;
  if (!url) return [];
  const sql = neon(url);
  const rows = await sql`
    SELECT id, professional_user_id, monthly_limit_minutes, warn_at_percent, hard_stop, updated_at
    FROM audio_transcription_budgets
    WHERE organization_id = ${organizationId}
    ORDER BY professional_user_id NULLS FIRST, updated_at DESC
  `;
  return rows as Array<BudgetRow & { id: string; professional_user_id: string | null; updated_at: string }>;
}

export async function upsertAudioTranscriptionBudget(
  env: Env,
  input: {
    organizationId: string;
    professionalUserId?: string | null;
    monthlyLimitMinutes: number;
    warnAtPercent: number;
    hardStop: boolean;
  },
): Promise<unknown> {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString;
  if (!url) throw new Error("Database URL not configured");
  const sql = neon(url);
  const professionalUserId = input.professionalUserId?.trim() || null;

  const rows = professionalUserId
    ? sql`
        INSERT INTO audio_transcription_budgets (
          organization_id,
          professional_user_id,
          monthly_limit_minutes,
          warn_at_percent,
          hard_stop,
          updated_at
        )
        VALUES (
          ${input.organizationId},
          ${professionalUserId},
          ${input.monthlyLimitMinutes},
          ${input.warnAtPercent},
          ${input.hardStop},
          now()
        )
        ON CONFLICT (organization_id, professional_user_id)
        WHERE professional_user_id IS NOT NULL
        DO UPDATE
        SET monthly_limit_minutes = EXCLUDED.monthly_limit_minutes,
            warn_at_percent = EXCLUDED.warn_at_percent,
            hard_stop = EXCLUDED.hard_stop,
            updated_at = now()
        RETURNING *
      `
    : sql`
        INSERT INTO audio_transcription_budgets (
          organization_id,
          professional_user_id,
          monthly_limit_minutes,
          warn_at_percent,
          hard_stop,
          updated_at
        )
        VALUES (
          ${input.organizationId},
          NULL,
          ${input.monthlyLimitMinutes},
          ${input.warnAtPercent},
          ${input.hardStop},
          now()
        )
        ON CONFLICT (organization_id)
        WHERE professional_user_id IS NULL
        DO UPDATE
        SET monthly_limit_minutes = EXCLUDED.monthly_limit_minutes,
            warn_at_percent = EXCLUDED.warn_at_percent,
            hard_stop = EXCLUDED.hard_stop,
            updated_at = now()
        RETURNING *
      `;

  const [row] = await rows;
  return row;
}

export async function deleteAudioTranscriptionBudget(
  env: Env,
  input: { organizationId: string; professionalUserId?: string | null },
): Promise<number> {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString;
  if (!url) throw new Error("Database URL not configured");
  const sql = neon(url);
  const professionalUserId = input.professionalUserId?.trim() || null;

  const rows = professionalUserId
    ? await sql`
        DELETE FROM audio_transcription_budgets
        WHERE organization_id = ${input.organizationId}
          AND professional_user_id = ${professionalUserId}
        RETURNING id
      `
    : await sql`
        DELETE FROM audio_transcription_budgets
        WHERE organization_id = ${input.organizationId}
          AND professional_user_id IS NULL
        RETURNING id
      `;

  return rows.length;
}

export async function getAudioTranscriptionMonthlyUsage(
  env: Env,
  organizationId: string,
): Promise<Array<{ therapist_id: string | null; used_minutes: number; captured_seconds: number }>> {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString;
  if (!url) return [];
  const sql = neon(url);
  const rows = await sql`
    SELECT therapist_id, CEIL(COALESCE(SUM(captured_seconds), 0) / 60.0)::integer AS used_minutes,
           COALESCE(SUM(captured_seconds), 0)::integer AS captured_seconds
    FROM clinical_scribe_logs
    WHERE organization_id = ${organizationId}
      AND created_at >= date_trunc('month', now())
    GROUP BY therapist_id
    ORDER BY used_minutes DESC
  `;
  return rows as Array<{ therapist_id: string | null; used_minutes: number; captured_seconds: number }>;
}

function buildUsage(row: BudgetRow, usedSeconds: number, requestedMinutes: number): BudgetUsage {
  const usedMinutes = estimateTranscriptionMinutes(usedSeconds);
  const limitMinutes = Math.max(0, Number(row.monthly_limit_minutes ?? 0));
  const projectedMinutes = usedMinutes + requestedMinutes;
  const warnAtPercent = Math.min(100, Math.max(1, Number(row.warn_at_percent ?? 80)));
  const warning =
    limitMinutes > 0 && projectedMinutes >= Math.ceil((limitMinutes * warnAtPercent) / 100);

  return {
    limitMinutes,
    usedMinutes,
    requestedMinutes,
    projectedMinutes,
    remainingMinutes: Math.max(0, limitMinutes - usedMinutes),
    warnAtPercent,
    hardStop: Boolean(row.hard_stop),
    warning,
  };
}

function buildFallbackCheck(requestedSeconds: number, reason: string): TranscriptionBudgetCheck {
  const requestedMinutes = estimateTranscriptionMinutes(requestedSeconds);
  return {
    configured: false,
    allowed: true,
    scope: "none",
    reason,
    organization: {
      limitMinutes: DEFAULT_ORG_LIMIT_MINUTES,
      usedMinutes: 0,
      requestedMinutes,
      projectedMinutes: requestedMinutes,
      remainingMinutes: DEFAULT_ORG_LIMIT_MINUTES,
      warnAtPercent: 80,
      hardStop: false,
      warning: false,
    },
  };
}
