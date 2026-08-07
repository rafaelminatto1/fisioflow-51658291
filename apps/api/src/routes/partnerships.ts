import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET /api/partnerships - Listar parcerias com contagem de pacientes
app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);

  try {
    const query = `
      SELECT
        p.*,
        COUNT(pt.id) FILTER (WHERE pt.deleted_at IS NULL) as total_patients,
        COUNT(pt.id) FILTER (WHERE pt.deleted_at IS NULL AND pt.partnership_role = 'aluno_cliente') as total_students,
        COUNT(pt.id) FILTER (WHERE pt.deleted_at IS NULL AND pt.partnership_role = 'professor') as total_professors
      FROM partnerships p
      LEFT JOIN patients pt ON pt.partnership_id = p.id OR (pt.partner_company_name IS NOT NULL AND LOWER(pt.partner_company_name) = LOWER(p.name))
      WHERE p.organization_id = $1
      GROUP BY p.id
      ORDER BY p.name ASC
    `;

    const result = await pool.query(query, [user.organizationId]);

    return c.json({
      data: result.rows.map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        description: row.description || "",
        studentSessionFee: Number(row.student_session_fee || 160.00),
        professorPays: Boolean(row.professor_pays),
        professorSessionFee: Number(row.professor_session_fee || 0.00),
        isActive: Boolean(row.is_active),
        totalPatients: Number(row.total_patients || 0),
        totalStudents: Number(row.total_students || 0),
        totalProfessors: Number(row.total_professors || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error("[Partnerships API] Error fetching partnerships:", error);
    return c.json({ error: "Erro ao buscar parcerias" }, 500);
  }
});

// POST /api/partnerships - Criar nova parceria
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = await c.req.json();

  const {
    name,
    description = "",
    studentSessionFee = 160.00,
    professorPays = false,
    professorSessionFee = 0.00,
    isActive = true,
  } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return c.json({ error: "Nome da parceria é obrigatório" }, 400);
  }

  try {
    const query = `
      INSERT INTO partnerships (
        organization_id, name, description, student_session_fee, professor_pays, professor_session_fee, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      user.organizationId,
      name.trim(),
      description,
      studentSessionFee,
      professorPays,
      professorSessionFee,
      isActive,
    ]);

    const row = result.rows[0];
    return c.json({
      data: {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        description: row.description || "",
        studentSessionFee: Number(row.student_session_fee),
        professorPays: Boolean(row.professor_pays),
        professorSessionFee: Number(row.professor_session_fee),
        isActive: Boolean(row.is_active),
        totalPatients: 0,
        totalStudents: 0,
        totalProfessors: 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    }, 201);
  } catch (error) {
    console.error("[Partnerships API] Error creating partnership:", error);
    return c.json({ error: "Erro ao criar parceria" }, 500);
  }
});

// PUT /api/partnerships/:id - Atualizar parceria existente
app.put("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const id = c.req.param("id");
  const body = await c.req.json();

  const {
    name,
    description,
    studentSessionFee,
    professorPays,
    professorSessionFee,
    isActive,
  } = body;

  try {
    const query = `
      UPDATE partnerships
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        student_session_fee = COALESCE($3, student_session_fee),
        professor_pays = COALESCE($4, professor_pays),
        professor_session_fee = COALESCE($5, professor_session_fee),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $7 AND organization_id = $8
      RETURNING *
    `;

    const result = await pool.query(query, [
      name ? name.trim() : null,
      description !== undefined ? description : null,
      studentSessionFee !== undefined ? studentSessionFee : null,
      professorPays !== undefined ? professorPays : null,
      professorSessionFee !== undefined ? professorSessionFee : null,
      isActive !== undefined ? isActive : null,
      id,
      user.organizationId,
    ]);

    if (!result.rows.length) {
      return c.json({ error: "Parceria não encontrada" }, 404);
    }

    const row = result.rows[0];
    return c.json({
      data: {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        description: row.description || "",
        studentSessionFee: Number(row.student_session_fee),
        professorPays: Boolean(row.professor_pays),
        professorSessionFee: Number(row.professor_session_fee),
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("[Partnerships API] Error updating partnership:", error);
    return c.json({ error: "Erro ao atualizar parceria" }, 500);
  }
});

// DELETE /api/partnerships/:id - Remover parceria
app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const id = c.req.param("id");

  try {
    const result = await pool.query(
      `DELETE FROM partnerships WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, user.organizationId]
    );

    if (!result.rows.length) {
      return c.json({ error: "Parceria não encontrada" }, 404);
    }

    // Limpar vinculo nos pacientes
    await pool.query(
      `UPDATE patients SET partnership_id = NULL WHERE partnership_id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("[Partnerships API] Error deleting partnership:", error);
    return c.json({ error: "Erro ao excluir parceria" }, 500);
  }
});

export default app;
