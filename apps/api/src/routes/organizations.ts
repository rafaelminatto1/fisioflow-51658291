import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);

async function hasTable(pool: ReturnType<typeof createPool>, table: string): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      LIMIT 1
    `,
    [table],
  );
  return result.rows.length > 0;
}

async function hasColumn(
  pool: ReturnType<typeof createPool>,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [table, column],
  );
  return result.rows.length > 0;
}

const buildFallbackOrganization = (id: string) => ({
  id,
  name: "Mooca Fisio",
  slug: "mooca-fisio",
  settings: {
    whatsapp_enabled: true,
    email_enabled: true,
  },
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

app.get("/current", async (c) => {
  const user = c.get("user");
  const organizationId = user.organizationId || "00000000-0000-0000-0000-000000000001";

  if (organizationId === "00000000-0000-0000-0000-000000000001") {
    return c.json({ data: buildFallbackOrganization(organizationId) });
  }

  const pool = await createPool(c.env);

  if (!(await hasTable(pool, "organizations"))) {
    return c.json({ data: buildFallbackOrganization(organizationId) });
  }

  const [hasSlug, hasSettings, hasActive, hasCreatedAt, hasUpdatedAt] = await Promise.all([
    hasColumn(pool, "organizations", "slug"),
    hasColumn(pool, "organizations", "settings"),
    hasColumn(pool, "organizations", "active"),
    hasColumn(pool, "organizations", "created_at"),
    hasColumn(pool, "organizations", "updated_at"),
  ]);

  const selectColumns = [
    "id",
    "name",
    hasSlug ? "slug" : "NULL::text AS slug",
    hasSettings ? "settings" : "'{}'::jsonb AS settings",
    hasActive ? "active" : "true AS active",
    hasCreatedAt ? "created_at" : "NULL::timestamptz AS created_at",
    hasUpdatedAt ? "updated_at" : "NULL::timestamptz AS updated_at",
  ];

  try {
    const result = await pool.query(
      `
        SELECT ${selectColumns.join(", ")}
        FROM organizations
        WHERE id = $1
        LIMIT 1
      `,
      [organizationId],
    );

    if (!result.rows.length) {
      return c.json({ data: buildFallbackOrganization(organizationId) });
    }

    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error("[organizations/current] fallback due to query error:", error);
    return c.json({ data: buildFallbackOrganization(organizationId) });
  }
});

app.get("/:id", async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");

  // Para clínica única, retornamos sempre o objeto padrão se solicitado o ID padrão
  if (id === "00000000-0000-0000-0000-000000000001") {
    return c.json({ data: buildFallbackOrganization(id) });
  }

  const pool = await createPool(c.env);
  // ... resto do código original como fallback secundário

  if (!(await hasTable(pool, "organizations"))) {
    return c.json({ data: buildFallbackOrganization(id) });
  }

  const [hasSlug, hasSettings, hasActive, hasCreatedAt, hasUpdatedAt] = await Promise.all([
    hasColumn(pool, "organizations", "slug"),
    hasColumn(pool, "organizations", "settings"),
    hasColumn(pool, "organizations", "active"),
    hasColumn(pool, "organizations", "created_at"),
    hasColumn(pool, "organizations", "updated_at"),
  ]);

  const selectColumns = [
    "id",
    "name",
    hasSlug ? "slug" : "NULL::text AS slug",
    hasSettings ? "settings" : "'{}'::jsonb AS settings",
    hasActive ? "active" : "true AS active",
    hasCreatedAt ? "created_at" : "NULL::timestamptz AS created_at",
    hasUpdatedAt ? "updated_at" : "NULL::timestamptz AS updated_at",
  ];

  try {
    const result = await pool.query(
      `
        SELECT ${selectColumns.join(", ")}
        FROM organizations
        WHERE id = $1 AND id = $2
        LIMIT 1
      `,
      [id, user.organizationId],
    );

    if (!result.rows.length) {
      if (id === user.organizationId) {
        return c.json({ data: buildFallbackOrganization(id) });
      }
      return c.json({ error: "Organização não encontrada" }, 404);
    }

    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error("[organizations/get] fallback due to query error:", error);
    if (id === user.organizationId) {
      return c.json({ data: buildFallbackOrganization(id) });
    }
    return c.json({ error: "Organização não encontrada" }, 404);
  }
});

app.post("/", async (c) => {
  const {
    name,
    slug,
    settings = {},
    active = true,
  } = (await c.req.json()) as Record<string, unknown>;
  if (!name || typeof name !== "string") {
    return c.json({ error: "Nome obrigatório" }, 400);
  }
  if (!slug || typeof slug !== "string") {
    return c.json({ error: "Slug obrigatório" }, 400);
  }

  const pool = await createPool(c.env);
  const result = await pool.query(
    `
      INSERT INTO organizations (name, slug, settings, active, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, NOW(), NOW())
      RETURNING id, name, slug, settings, active, created_at, updated_at
    `,
    [name, slug, JSON.stringify(settings), active],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put("/:id", async (c) => {
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const pool = await createPool(c.env);

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [];

  if (body.name !== undefined) {
    params.push(body.name);
    sets.push(`name = $${params.length}`);
  }
  if (body.slug !== undefined) {
    params.push(body.slug);
    sets.push(`slug = $${params.length}`);
  }
  if (body.active !== undefined) {
    params.push(Boolean(body.active));
    sets.push(`active = $${params.length}`);
  }
  if (body.settings !== undefined) {
    params.push(JSON.stringify(body.settings));
    sets.push(`settings = $${params.length}::jsonb`);
  }

  if (!sets.length) {
    return c.json({ error: "Nada para atualizar" }, 400);
  }

  params.push(id, c.get("user").organizationId);
  const result = await pool.query(
    `
      UPDATE organizations
      SET ${sets.join(", ")}
      WHERE id = $${params.length - 1} AND id = $${params.length}
      RETURNING id, name, slug, settings, active, created_at, updated_at
    `,
    params,
  );

  if (!result.rows.length) {
    return c.json({ error: "Organização não encontrada" }, 404);
  }

  return c.json({ data: result.rows[0] });
});

export { app as organizationsRoutes };
