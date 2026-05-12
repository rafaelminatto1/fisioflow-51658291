import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/groups/classes
 * Lista todas as turmas da organização
 */
app.get("/classes", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const result = await pool.query(
      `SELECT gc.*, p.full_name as therapist_name,
        (SELECT COUNT(*) FROM group_enrollments WHERE class_id = gc.id AND status = 'confirmed') as enrolled_count
       FROM group_classes gc
       LEFT JOIN profiles p ON p.id = gc.therapist_id
       WHERE gc.organization_id = $1 AND gc.is_active = true
       ORDER BY gc.day_of_week ASC, gc.start_time ASC`,
      [user.organizationId]
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Groups] Error listing classes:", error);
    return c.json({ error: "Failed to list classes" }, 500);
  }
});

/**
 * POST /api/groups/classes
 * Cria uma nova turma
 */
app.post("/classes", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const body = await c.req.json();

  try {
    const result = await pool.query(
      `INSERT INTO group_classes (
        organization_id, name, description, therapist_id, capacity, 
        day_of_week, start_time, end_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        user.organizationId,
        body.name,
        body.description,
        body.therapistId,
        body.capacity,
        body.dayOfWeek,
        body.startTime,
        body.endTime,
      ]
    );

    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error("[Groups] Error creating class:", error);
    return c.json({ error: "Failed to create class" }, 500);
  }
});

/**
 * POST /api/groups/enroll
 * Matrícula um paciente em uma turma
 */
app.post("/enroll", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const { classId, patientId } = await c.req.json();

  try {
    // Verificar capacidade
    const capRes = await pool.query(
      `SELECT capacity, (SELECT COUNT(*) FROM group_enrollments WHERE class_id = $1 AND status = 'confirmed') as current
       FROM group_classes WHERE id = $1`,
      [classId]
    );

    const isFull = capRes.rows[0].current >= capRes.rows[0].capacity;
    const status = isFull ? 'waitlist' : 'confirmed';

    const result = await pool.query(
      `INSERT INTO group_enrollments (organization_id, class_id, patient_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.organizationId, classId, patientId, status]
    );

    return c.json({ data: result.rows[0], waitlist: isFull });
  } catch (error) {
    console.error("[Groups] Error enrolling patient:", error);
    return c.json({ error: "Failed to enroll patient" }, 500);
  }
});

/**
 * POST /api/groups/checkin
 * Registra presença (com cache D1 para performance extrema)
 */
app.post("/checkin", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const { enrollmentId, date, status, notes } = await c.req.json();

  try {
    // 1. Salvar no Neon (Persistência oficial)
    const result = await pool.query(
      `INSERT INTO group_checkins (organization_id, enrollment_id, session_date, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.organizationId, enrollmentId, date, status, notes]
    );

    // 2. Se D1 estiver disponível, espelhar para consulta rápida "Live Room"
    if (c.env.DB) {
      await c.env.DB.prepare(
        "INSERT INTO live_checkins (id, org_id, enrollment_id, status, timestamp) VALUES (?, ?, ?, ?, ?)"
      ).bind(result.rows[0].id, user.organizationId, enrollmentId, status, Date.now()).run();
    }

    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error("[Groups] Error during checkin:", error);
    return c.json({ error: "Failed to record checkin" }, 500);
  }
});

export { app as groupsRoutes };
