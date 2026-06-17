import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { Env } from "../types/env";
import type { AutomationDefinition, AutomationNode } from "../lib/automation/types";
import { evaluateCondition } from "../lib/automation/conditions";
import { nextNodeId } from "../lib/automation/runAutomation";
import { buildActionHandlers } from "../lib/automation/actionHandlers";

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

    return { steps, completed: !current };
  }
}
