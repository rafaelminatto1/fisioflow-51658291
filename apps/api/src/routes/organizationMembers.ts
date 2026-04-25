import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const organizationId = c.req.query("organizationId") || user.organizationId;

  const fallback = [
    {
      id: "om-default",
      organization_id: organizationId,
      user_id: user.uid,
      role: "admin",
      active: true,
      profiles: {
        full_name: user.email?.split("@")[0] || "Profissional",
        email: user.email || "contato@fisioflow.com.br",
      },
    },
  ];

  // Para clínica única, se for o ID padrão, retornamos o fallback imediatamente
  if (organizationId === "00000000-0000-0000-0000-000000000001") {
    return c.json({ data: fallback, total: 1 });
  }

  try {
    const result = await pool.query(
      `SELECT om.*, json_build_object('full_name', p.full_name, 'email', p.email) AS profiles
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

export { app as organizationMembersRoutes };
