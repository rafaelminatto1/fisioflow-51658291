import { getRawSql } from "./db";
import type { Env } from "../types/env";

export type ClinicalAccessAction = "read" | "create" | "update" | "delete" | "export";

interface LogParams {
  env: Env;
  organizationId: string;
  userId: string;
  resource: string;
  action: ClinicalAccessAction;
  patientId?: string | null;
  sessionId?: string | null;
  source?: "neon" | "r2_archive";
  requestIp?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * LGPD G2 (Parecer DPO 2026-05-19). Fire-and-forget — silenciar erros pra
 * NUNCA quebrar a rota clínica. Pareie com `ctx.waitUntil(logClinicalAccess(...))`.
 */
export async function logClinicalAccess(p: LogParams): Promise<void> {
  try {
    if (!p.organizationId || !p.userId || !p.resource || !p.action) return;
    const sql = getRawSql(p.env, "write");
    await sql`
      INSERT INTO public.clinical_access_logs
        (organization_id, user_id, patient_id, session_id, resource, action, source, request_ip, user_agent, metadata)
      VALUES
        (${p.organizationId}, ${p.userId}, ${p.patientId ?? null}, ${p.sessionId ?? null},
         ${p.resource}, ${p.action}, ${p.source ?? "neon"},
         ${p.requestIp ?? null}, ${p.userAgent ?? null}, ${JSON.stringify(p.metadata ?? {})}::jsonb)
    `;
  } catch (err) {
    console.warn("[clinicalAccessLog] insert failed", err);
  }
}

/** Extrai IP do cliente (Cloudflare > X-Forwarded-For). */
export function extractClientIp(headers: Headers): string | null {
  const cf = headers.get("CF-Connecting-IP");
  if (cf) return cf;
  const xff = headers.get("X-Forwarded-For");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return null;
}
