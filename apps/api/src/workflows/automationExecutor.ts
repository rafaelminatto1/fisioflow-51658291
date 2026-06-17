import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { Env } from "../types/env";
import type { AutomationDefinition, AutomationNode } from "../lib/automation/types";
import { evaluateCondition } from "../lib/automation/conditions";
import { nextNodeId } from "../lib/automation/runAutomation";
import { buildActionHandlers } from "../lib/automation/actionHandlers";
import { getRawSql, runWithOrg } from "../lib/db";

export type AutomationWorkflowParams = {
  automationId?: string;
  definition: AutomationDefinition;
  context: Record<string, unknown>;
};

/**
 * Executa uma automação (DAG) de forma DURÁVEL: ações via step.do (retry/idempotência)
 * e esperas via step.sleep (sobrevivem a reinícios). Reusa a lógica de grafo do engine puro.
 */
export class AutomationExecutor extends WorkflowEntrypoint<Env, AutomationWorkflowParams> {
  async run(event: WorkflowEvent<AutomationWorkflowParams>, step: WorkflowStep) {
    const { definition, context } = event.payload;
    const handlers = buildActionHandlers(this.env);
    const byId = new Map<string, AutomationNode>(definition.nodes.map((n) => [n.id, n]));

    const startedAt = Date.now();
    const orgId = String(context.organizationId ?? context.orgId ?? context.organization_id ?? "");
    const automationId = String(event.payload.automationId ?? "");

    let current: AutomationNode | undefined = definition.nodes.find((n) => n.type === "trigger");
    let steps = 0;
    const maxSteps = 100;

    while (current && steps < maxSteps) {
      steps++;
      let branch: "true" | "false" | undefined;
      const node = current;

      switch (node.type) {
        case "trigger":
          break;
        case "condition":
          branch = evaluateCondition(node, context) ? "true" : "false";
          break;
        case "action":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await step.do(`action-${node.id}-${steps}`, async (): Promise<any> => {
            const handler = handlers[node.action];
            if (!handler) return { skipped: `handler ausente: ${node.action}` };
            const r = await handler(node.params ?? {}, context);
            return r && typeof r === "object" ? r : { result: r ?? null };
          });
          break;
        case "wait":
          await step.sleep(`wait-${node.id}-${steps}`, `${node.seconds} seconds`);
          break;
      }

      const nextId = nextNodeId(definition, node.id, branch);
      current = nextId ? byId.get(nextId) : undefined;
    }

    const completed = !current;
    if (orgId) {
      await step.do("log-completion", async () => {
        try {
          await runWithOrg(orgId, async () => {
            const sql = getRawSql(this.env, "write");
            await sql(
              `INSERT INTO automation_logs
                 (organization_id, automation_id, automation_name, event_type, status, started_at, completed_at, duration_ms, error)
               VALUES ($1,$2,$3,$4,$5, to_timestamp($6/1000.0), now(), $7, $8)`,
              [
                orgId,
                automationId,
                "",
                String(context.eventType ?? ""),
                completed ? "completed" : "incomplete",
                startedAt,
                Date.now() - startedAt,
                null,
              ],
            );
          });
        } catch (e) {
          console.error("[AutomationExecutor] completion log failed", e);
        }
        return { logged: true };
      });
    }

    return { steps, completed };
  }
}
