/**
 * Rotas: CRM Automations CRUD + scan manual
 *
 * GET    /api/crm-automations               — lista regras + templates globais
 * POST   /api/crm-automations               — cria regra na org
 * PUT    /api/crm-automations/:id           — atualiza regra
 * DELETE /api/crm-automations/:id           — apaga regra (templates globais protegidos)
 * GET    /api/crm-automations/templates     — só os templates globais
 * GET    /api/crm-automations/:id/executions — histórico de execuções
 * POST   /api/crm-automations/scan          — força executor agora (admin only)
 */
import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { isUuid } from "../lib/validators";
import { scanPendingExecutions } from "../services/crm-automation-engine";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT * FROM crm_automation_rules
      WHERE organization_id = $1 OR organization_id IS NULL
      ORDER BY (organization_id IS NULL) ASC, prioridade ASC, created_at DESC`,
    [user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.get("/templates", requireAuth, async (c) => {
  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT * FROM crm_automation_rules WHERE organization_id IS NULL ORDER BY nome ASC`,
  );
  return c.json({ data: result.rows });
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  if (!body.nome || !body.gatilho_tipo) {
    return c.json({ error: "nome e gatilho_tipo são obrigatórios" }, 400);
  }
  const result = await pool.query(
    `INSERT INTO crm_automation_rules
       (organization_id, nome, descricao, ativo, gatilho_tipo, gatilho_config,
        condicoes, acoes, prioridade, cooldown_minutes, created_by)
     VALUES ($1,$2,$3,COALESCE($4,true),$5,$6::jsonb,$7::jsonb,$8::jsonb,
             COALESCE($9,100),COALESCE($10,0),$11)
     RETURNING *`,
    [
      user.organizationId,
      String(body.nome),
      (body.descricao as string | null) ?? null,
      body.ativo as boolean | null,
      String(body.gatilho_tipo),
      JSON.stringify(body.gatilho_config ?? {}),
      JSON.stringify(body.condicoes ?? []),
      JSON.stringify(body.acoes ?? []),
      body.prioridade as number | null,
      body.cooldown_minutes as number | null,
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "id inválido" }, 400);
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [];
  const fields: Array<[string, unknown, string?]> = [
    ["nome", body.nome],
    ["descricao", body.descricao],
    ["ativo", body.ativo],
    ["gatilho_tipo", body.gatilho_tipo],
    ["gatilho_config", body.gatilho_config !== undefined ? JSON.stringify(body.gatilho_config) : undefined, "jsonb"],
    ["condicoes", body.condicoes !== undefined ? JSON.stringify(body.condicoes) : undefined, "jsonb"],
    ["acoes", body.acoes !== undefined ? JSON.stringify(body.acoes) : undefined, "jsonb"],
    ["prioridade", body.prioridade],
    ["cooldown_minutes", body.cooldown_minutes],
  ];
  for (const [name, value, cast] of fields) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${name} = $${params.length}${cast ? `::${cast}` : ""}`);
  }
  if (sets.length === 1) return c.json({ error: "nenhum campo para atualizar" }, 400);

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE crm_automation_rules SET ${sets.join(", ")}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: "regra não encontrada" }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "id inválido" }, 400);
  const pool = createPool(c.env);
  const result = await pool.query(
    `DELETE FROM crm_automation_rules
      WHERE id = $1 AND organization_id = $2
      RETURNING id`,
    [id, user.organizationId],
  );
  if (!result.rows.length) {
    return c.json({ error: "regra não encontrada (templates globais não podem ser apagados)" }, 404);
  }
  return c.json({ ok: true });
});

app.get("/:id/executions", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "id inválido" }, 400);
  const pool = createPool(c.env);
  const { limit = "50" } = c.req.query();
  const result = await pool.query(
    `SELECT * FROM crm_automation_executions
      WHERE rule_id = $1 AND organization_id = $2
      ORDER BY created_at DESC LIMIT $3`,
    [id, user.organizationId, Math.min(Number(limit) || 50, 200)],
  );
  return c.json({ data: result.rows });
});

app.post("/scan", requireAuth, async (c) => {
  const pool = createPool(c.env);
  const out = await scanPendingExecutions(c.env, pool, 100);
  return c.json({ data: out });
});

export const crmAutomationsRoutes = app;
