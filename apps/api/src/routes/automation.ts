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

export const CreateAutomationBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  triggerEvent: z.string().max(120).optional(),
  enabled: z.boolean().optional(),
  definition: automationDefinitionSchema,
});
export type CreateAutomationInput = z.infer<typeof CreateAutomationBody>;

export function buildAutomationInsert(body: CreateAutomationInput, orgId: string, createdBy: string) {
  return {
    text: `INSERT INTO automations (org_id, name, description, trigger_event, enabled, definition, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    params: [
      orgId,
      body.name,
      body.description ?? null,
      body.triggerEvent ?? null,
      body.enabled ?? false,
      JSON.stringify(body.definition),
      createdBy,
    ],
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const result = await pool.query(
    `SELECT * FROM automations WHERE org_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [user.organizationId],
  );
  return c.json({ data: result.rows ?? [] });
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  let body: CreateAutomationInput;
  try {
    body = CreateAutomationBody.parse(await c.req.json());
  } catch (e: any) {
    return c.json({ error: e?.message ?? "dados inválidos" }, 400);
  }
  const pool = await createPool(c.env);
  const ins = buildAutomationInsert(body, user.organizationId, user.uid);
  const result = await pool.query(ins.text, ins.params);
  return c.json({ data: result.rows?.[0] ?? null }, 201);
});

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

app.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return c.json({ error: "id inválido" }, 400);
  const user = c.get("user");
  const pool = await createPool(c.env);
  const result = await pool.query(`SELECT * FROM automations WHERE id = $1 AND org_id = $2`, [
    id,
    user.organizationId,
  ]);
  const row = result.rows?.[0];
  if (!row) return c.json({ error: "não encontrado" }, 404);
  return c.json({ data: row });
});

app.put("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return c.json({ error: "id inválido" }, 400);
  const user = c.get("user");
  let body: CreateAutomationInput;
  try {
    body = CreateAutomationBody.parse(await c.req.json());
  } catch (e: any) {
    return c.json({ error: e?.message ?? "dados inválidos" }, 400);
  }
  const pool = await createPool(c.env);
  const result = await pool.query(
    `UPDATE automations
        SET name=$1, description=$2, trigger_event=$3, enabled=$4, definition=$5, updated_at=now()
      WHERE id=$6 AND org_id=$7 RETURNING *`,
    [
      body.name,
      body.description ?? null,
      body.triggerEvent ?? null,
      body.enabled ?? false,
      JSON.stringify(body.definition),
      id,
      user.organizationId,
    ],
  );
  const row = result.rows?.[0];
  if (!row) return c.json({ error: "não encontrado" }, 404);
  return c.json({ data: row });
});

app.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return c.json({ error: "id inválido" }, 400);
  const user = c.get("user");
  const pool = await createPool(c.env);
  await pool.query(`DELETE FROM automations WHERE id = $1 AND org_id = $2`, [id, user.organizationId]);
  return c.json({ ok: true });
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
