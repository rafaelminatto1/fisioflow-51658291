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
      `SELECT id, definition FROM automations
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
    try {
      await runAutomation(parsed.data, event.data ?? {}, {
        actions: handlers,
        sleep: async () => {}, // durable waits handled by Workflow (slice 2b); no-op here
      });
      ran++;
    } catch (e) {
      console.error("[Automation] run failed", row.id, e);
    }
  }
  return { matched: rows.length, ran };
}
