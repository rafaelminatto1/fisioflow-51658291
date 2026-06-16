import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";
import { automationDefinitionSchema } from "../lib/automation/types";
import { runAutomation } from "../lib/automation/runAutomation";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const SimulateBody = z.object({
  definition: automationDefinitionSchema,
  context: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Dry-run de uma automação: executa o motor com handlers no-op (sem efeitos colaterais)
 * e sleep instantâneo. Retorna o trace para o builder pré-visualizar.
 */
export async function runSimulation(input: unknown) {
  const { definition, context } = SimulateBody.parse(input);
  const recorded: string[] = [];
  return runAutomation(definition, context, {
    actions: new Proxy(
      {},
      {
        get:
          (_t, name: string) =>
          async (params: Record<string, unknown>) => {
            recorded.push(name);
            return { simulated: true, action: name, params };
          },
      },
    ) as Record<string, never>,
    sleep: async () => {},
  });
}

app.get("/logs", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const limit = Math.min(200, Math.max(10, Number(c.req.query("limit") ?? 50)));

  const result = await pool.query(
    `
      SELECT id, automation_id, automation_name, status,
             started_at, completed_at, duration_ms, error
      FROM automation_logs
      WHERE organization_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `,
    [user.organizationId, limit],
  );

  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.post("/simulate", requireAuth, async (c) => {
  try {
    const result = await runSimulation(await c.req.json());
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e?.message ?? "definição inválida" }, 400);
  }
});

export { app as automationRoutes };
