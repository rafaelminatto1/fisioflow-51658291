import type { Env } from "../../types/env";
import { runAutomation, type ActionHandler } from "./runAutomation";
import { automationDefinitionSchema } from "./types";
import { buildActionHandlers } from "./actionHandlers";

type Sql = (q: string, params?: unknown[]) => Promise<{ rows: any[] }>;

export type PlatformEvent = { type: string; data?: Record<string, unknown> };

function orgFromEvent(event: PlatformEvent): string | null {
  const d = event.data ?? {};
  return (d.organizationId as string) ?? (d.orgId as string) ?? (d.organization_id as string) ?? null;
}

/**
 * Runs enabled automations whose trigger_event matches the platform event.
 * GATED: real actions only execute when AUTOMATION_EXECUTION_ENABLED === "true".
 * Returns a summary; never throws (logs internally) so the queue ack isn't blocked.
 */
export async function runAutomationsForEvent(
  sql: Sql,
  env: Env,
  event: PlatformEvent,
  handlers: Record<string, ActionHandler> = buildActionHandlers(env),
): Promise<{ skipped?: string; matched: number; ran: number }> {
  if (env.AUTOMATION_EXECUTION_ENABLED !== "true") return { skipped: "disabled", matched: 0, ran: 0 };
  const orgId = orgFromEvent(event);
  if (!orgId) return { skipped: "no org", matched: 0, ran: 0 };

  let rows: any[] = [];
  try {
    const res = await sql(
      `SELECT id, name, definition FROM automations
        WHERE org_id = $1 AND trigger_event = $2 AND enabled = true LIMIT 50`,
      [orgId, event.type],
    );
    rows = res.rows ?? [];
  } catch (e) {
    console.error("[Automation] query failed", e);
    return { skipped: "query error", matched: 0, ran: 0 };
  }

  let ran = 0;
  for (const row of rows) {
    const parsed = automationDefinitionSchema.safeParse(
      typeof row.definition === "string" ? JSON.parse(row.definition) : row.definition,
    );
    if (!parsed.success) continue;
    const startedAt = Date.now();
    let status = "triggered";
    let errMsg: string | null = null;
    try {
      if (env.WORKFLOW_AUTOMATION) {
        // Durable execution: step.sleep survives restarts, actions get retries (slice 2b).
        await env.WORKFLOW_AUTOMATION.create({
          id: `auto-${row.id}-${Date.now()}`,
          params: { automationId: row.id, definition: parsed.data, context: event.data ?? {} },
        });
        status = "triggered"; // durable run continues async; completion tracked by the Workflow
      } else {
        // Fallback: inline run with no-op waits (no durable binding available).
        await runAutomation(parsed.data, event.data ?? {}, { actions: handlers, sleep: async () => {} });
        status = "completed";
      }
      ran++;
    } catch (e) {
      status = "failed";
      errMsg = String((e as Error)?.message ?? e);
      console.error("[Automation] run failed", row.id, e);
    }
    await logAutomationRun(sql, {
      orgId,
      automationId: String(row.id),
      automationName: String(row.name ?? ""),
      eventType: event.type,
      status,
      durationMs: Date.now() - startedAt,
      error: errMsg,
    });
  }
  return { matched: rows.length, ran };
}

async function logAutomationRun(
  sql: Sql,
  log: {
    orgId: string;
    automationId: string;
    automationName: string;
    eventType: string;
    status: string;
    durationMs: number;
    error: string | null;
  },
): Promise<void> {
  try {
    await sql(
      `INSERT INTO automation_logs
         (organization_id, automation_id, automation_name, event_type, status, started_at, completed_at, duration_ms, error)
       VALUES ($1,$2,$3,$4,$5, now(), now(), $6, $7)`,
      [log.orgId, log.automationId, log.automationName, log.eventType, log.status, log.durationMs, log.error],
    );
  } catch (e) {
    console.error("[Automation] log insert failed", e);
  }
}
