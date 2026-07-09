import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  // Sempre usar a organization do token — nunca aceitar do input do usuario (IDOR)
  const organizationId = user.organizationId;

  const fallback = [
    {
      id: "om-default",
      organization_id: organizationId,
      user_id: user.uid,
      role: "admin",
      active: true,
      profiles: {
        full_name: user.email?.split("@")[0] || "Profissional",
        email: user.email || "contato@moocafisio.com.br",
      },
    },
  ];

  // Para clínica única, se for o ID padrão, retornamos o fallback imediatamente
  if (organizationId === "00000000-0000-0000-0000-000000000001") {
    return c.json({ data: fallback, total: 1 });
  }

  try {
    const result = await pool.query(
      `SELECT om.*, json_build_object('full_name', p.full_name, 'email', p.email, 'phone', p.phone) AS profiles
       FROM organization_members om
       LEFT JOIN profiles p ON p.user_id = om.user_id
       WHERE om.organization_id = $1 AND om.active = true`,
      [organizationId],
    );

    if (!result.rows.length) {
      return c.json({ data: fallback, total: 1 });
    }

    return c.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("[OrganizationMembers] Database error:", error);
    return c.json({ data: fallback, total: 1 });
  }
});

/**
 * Telefone do membro (profiles.phone) — usado pelo WhatsApp de tarefas URGENTES
 * (specs/tarefas-integracoes US-01). Admin-only; aceita vazio para limpar.
 */
app.patch("/:userId/phone", requireAuth, async (c) => {
  const user = c.get("user");
  if (String(user.role ?? "").toLowerCase() !== "admin") {
    return c.json({ error: "Apenas administradores podem editar telefones" }, 403);
  }

  const userId = c.req.param("userId");
  const body = (await c.req.json().catch(() => ({}))) as { phone?: unknown };
  const raw = String(body.phone ?? "").trim();
  const phone = raw ? raw.replace(/[^\d+]/g, "").slice(0, 20) : null;
  if (phone && phone.replace(/\D/g, "").length < 10) {
    return c.json({ error: "Telefone inválido — use DDD + número (ex.: +5511999998888)" }, 400);
  }

  const pool = await createPool(c.env);
  const result = await pool.query(
    `UPDATE profiles SET phone = $1, updated_at = NOW()
     WHERE user_id = $2 AND organization_id = $3
     RETURNING user_id, phone`,
    [phone, userId, user.organizationId],
  );
  if (!result.rowCount) {
    return c.json({ error: "Perfil do membro não encontrado" }, 404);
  }
  return c.json({ data: result.rows[0] });
});

export { app as organizationMembersRoutes };
