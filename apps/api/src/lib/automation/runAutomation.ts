import { evaluateCondition } from "./conditions";
import type { AutomationDefinition, AutomationNode, TraceEntry } from "./types";

export type ActionHandler = (
  params: Record<string, unknown>,
  context: Record<string, unknown>,
) => Promise<unknown>;

export type RunDeps = {
  actions: Record<string, ActionHandler>;
  sleep: (seconds: number) => Promise<void>;
  maxSteps?: number;
};

function nextNodeId(def: AutomationDefinition, fromId: string, branch?: "true" | "false"): string | null {
  const edges = def.edges.filter((e) => e.from === fromId);
  if (branch) {
    const match = edges.find((e) => e.branch === branch);
    if (match) return match.to;
  }
  const plain = edges.find((e) => !e.branch) ?? edges[0];
  return plain ? plain.to : null;
}

export async function runAutomation(
  def: AutomationDefinition,
  context: Record<string, unknown>,
  deps: RunDeps,
): Promise<{ trace: TraceEntry[]; steps: number; completed: boolean }> {
  const maxSteps = deps.maxSteps ?? 50;
  const byId = new Map<string, AutomationNode>(def.nodes.map((n) => [n.id, n]));
  const trigger = def.nodes.find((n) => n.type === "trigger");
  const trace: TraceEntry[] = [];

  let current: AutomationNode | undefined = trigger;
  let steps = 0;

  while (current && steps < maxSteps) {
    steps++;
    let branch: "true" | "false" | undefined;

    switch (current.type) {
      case "trigger":
        trace.push({ id: current.id, type: "trigger" });
        break;
      case "condition": {
        const passed = evaluateCondition(current, context);
        branch = passed ? "true" : "false";
        trace.push({ id: current.id, type: "condition", passed });
        break;
      }
      case "action": {
        const handler = deps.actions[current.action];
        if (!handler) {
          trace.push({ id: current.id, type: "action", action: current.action, error: "handler ausente" });
        } else {
          try {
            const result = await handler(current.params ?? {}, context);
            trace.push({ id: current.id, type: "action", action: current.action, result });
          } catch (e) {
            trace.push({ id: current.id, type: "action", action: current.action, error: String((e as Error)?.message ?? e) });
          }
        }
        break;
      }
      case "wait":
        await deps.sleep(current.seconds);
        trace.push({ id: current.id, type: "wait", seconds: current.seconds });
        break;
    }

    const nextId = nextNodeId(def, current.id, branch);
    current = nextId ? byId.get(nextId) : undefined;
  }

  return { trace, steps, completed: !current };
}
