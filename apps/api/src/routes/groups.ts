import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type LiveCheckinRow = {
  id: string;
  org_id: string;
  enrollment_id: string;
  status: string;
  timestamp: number;
};

type LiveCheckinDetailsRow = {
  enrollment_id: string;
  patient_name: string | null;
  class_name: string | null;
};

let liveCheckinsTableReady = false;

async function ensureLiveCheckinsTable(db: D1Database) {
  if (liveCheckinsTableReady) return;

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS live_checkins (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        enrollment_id TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_live_checkins_org_timestamp
       ON live_checkins (org_id, timestamp DESC)`
    )
    .run();

  liveCheckinsTableReady = true;
}

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
      try {
        await ensureLiveCheckinsTable(c.env.DB);
        await c.env.DB.prepare(
          "INSERT INTO live_checkins (id, org_id, enrollment_id, status, timestamp) VALUES (?, ?, ?, ?, ?)"
        ).bind(result.rows[0].id, user.organizationId, enrollmentId, status, Date.now()).run();
      } catch (d1Error) {
        console.warn("[Groups] D1 live checkin mirror failed:", d1Error);
      }
    }

    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error("[Groups] Error during checkin:", error);
    return c.json({ error: "Failed to record checkin" }, 500);
  }
});

/**
 * GET /api/groups/live-status
 * Retorna os check-ins recentes da D1 para exibição na TV da recepção.
 */
app.get("/live-status", requireAuth, async (c) => {
  const user = c.get("user");
  if (!c.env.DB) return c.json({ error: "D1 não configurada" }, 503);

  try {
    await ensureLiveCheckinsTable(c.env.DB);

    const results = await c.env.DB.prepare(
      `SELECT id, org_id, enrollment_id, status, timestamp
       FROM live_checkins
       WHERE org_id = ?
       ORDER BY timestamp DESC
       LIMIT 10`
    ).bind(user.organizationId).all<LiveCheckinRow>();

    const liveCheckins = results.results ?? [];
    const enrollmentIds = [...new Set(liveCheckins.map((row) => row.enrollment_id))];

    if (enrollmentIds.length === 0) {
      return c.json({ data: [] });
    }

    const pool = createPool(c.env);
    const placeholders = enrollmentIds.map((_, index) => `$${index + 2}`).join(", ");
    const details = await pool.query<LiveCheckinDetailsRow>(
      `SELECT ge.id as enrollment_id, p.full_name as patient_name, gc.name as class_name
       FROM group_enrollments ge
       JOIN patients p ON p.id = ge.patient_id
       JOIN group_classes gc ON gc.id = ge.class_id
       WHERE ge.organization_id = $1
         AND ge.id IN (${placeholders})`,
      [user.organizationId, ...enrollmentIds]
    );

    const detailsByEnrollmentId = new Map(
      details.rows.map((row) => [row.enrollment_id, row])
    );

    const data = liveCheckins.map((row) => {
      const detail = detailsByEnrollmentId.get(row.enrollment_id);

      return {
        ...row,
        patient_name: detail?.patient_name ?? null,
        class_name: detail?.class_name ?? null,
      };
    });

    return c.json({ data });
  } catch (error: any) {
    console.error("[Groups/Live] Error:", error);
    return c.json({ error: "Falha ao buscar status em tempo real" }, 500);
  }
});

export { app as groupsRoutes };
