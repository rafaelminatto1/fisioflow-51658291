import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const pool = await createPool(c.env);

    const result = await pool.query(
      `
        SELECT
          p.*,
          CASE
            WHEN prof.id IS NULL THEN NULL
            ELSE json_build_object(
              'full_name', prof.full_name,
              'avatar_url', prof.avatar_url
            )
          END AS manager
        FROM projects p
        LEFT JOIN profiles prof ON prof.id = p.manager_id
        WHERE p.organization_id = $1
        ORDER BY p.created_at DESC
      `,
      [user.organizationId],
    );

    return c.json({ data: result.rows || result });
  } catch (error) {
    console.error("[Projects] GET / error:", error);
    return c.json(
      {
        error: "Erro ao buscar projetos",
        details: error instanceof Error ? error.message : String(error),
        data: [],
      },
      500,
    );
  }
});

app.get("/:id", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const pool = await createPool(c.env);
    const { id } = c.req.param();

    const result = await pool.query(
      `
        SELECT
          p.*,
          CASE
            WHEN prof.id IS NULL THEN NULL
            ELSE json_build_object(
              'full_name', prof.full_name,
              'avatar_url', prof.avatar_url
            )
          END AS manager
        FROM projects p
        LEFT JOIN profiles prof ON prof.id = p.manager_id
        WHERE p.id = $1 AND p.organization_id = $2
        LIMIT 1
      `,
      [id, user.organizationId],
    );

    if (!result.rows.length) return c.json({ error: "Projeto não encontrado" }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error("[Projects] GET /:id error:", error);
    return c.json(
      {
        error: "Erro ao buscar projeto",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

app.post("/", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const pool = await createPool(c.env);
    const body = (await c.req.json()) as Record<string, unknown>;

    if (!body.title) return c.json({ error: "title é obrigatório" }, 400);

    const result = await pool.query(
      `
        INSERT INTO projects (
          organization_id, title, description, status, start_date, end_date, created_by, manager_id, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
        RETURNING *
      `,
      [
        user.organizationId,
        String(body.title),
        body.description ?? null,
        body.status ?? "active",
        body.start_date ?? null,
        body.end_date ?? null,
        user.uid,
        body.manager_id ?? null,
      ],
    );

    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error("[Projects] POST / error:", error);
    return c.json(
      {
        error: "Erro ao criar projeto",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

app.put("/:id", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const pool = await createPool(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as Record<string, unknown>;

    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [];

    if (body.title !== undefined) {
      params.push(body.title);
      sets.push(`title = $${params.length}`);
    }
    if (body.description !== undefined) {
      params.push(body.description);
      sets.push(`description = $${params.length}`);
    }
    if (body.status !== undefined) {
      params.push(body.status);
      sets.push(`status = $${params.length}`);
    }
    if (body.start_date !== undefined) {
      params.push(body.start_date || null);
      sets.push(`start_date = $${params.length}`);
    }
    if (body.end_date !== undefined) {
      params.push(body.end_date || null);
      sets.push(`end_date = $${params.length}`);
    }
    if (body.manager_id !== undefined) {
      params.push(body.manager_id || null);
      sets.push(`manager_id = $${params.length}`);
    }

    params.push(id, user.organizationId);
    const result = await pool.query(
      `
        UPDATE projects
        SET ${sets.join(", ")}
        WHERE id = $${params.length - 1} AND organization_id = $${params.length}
        RETURNING *
      `,
      params,
    );

    if (!result.rows.length) return c.json({ error: "Projeto não encontrado" }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error("[Projects] PUT /:id error:", error);
    return c.json(
      {
        error: "Erro ao atualizar projeto",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

app.delete("/:id", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const pool = await createPool(c.env);
    const { id } = c.req.param();

    await pool.query("DELETE FROM projects WHERE id = $1 AND organization_id = $2", [
      id,
      user.organizationId,
    ]);

    return c.json({ ok: true });
  } catch (error) {
    console.error("[Projects] DELETE /:id error:", error);
    return c.json(
      {
        error: "Erro ao excluir projeto",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export { app as projectsRoutes };
