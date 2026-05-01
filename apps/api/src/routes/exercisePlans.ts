import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { callAI } from "../lib/ai/callAI";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// List plans for a patient
app.get("/", requireAuth, async (c) => {
  const { patientId } = c.req.query();
  const db = await createPool(c.env);

  let sql = `SELECT p.*, json_agg(i.* ORDER BY i.order_index) FILTER (WHERE i.id IS NOT NULL) AS items
             FROM exercise_plans p
             LEFT JOIN exercise_plan_items i ON i.plan_id = p.id`;
  const params: unknown[] = [];
  if (patientId) {
    sql += ` WHERE p.patient_id = $1`;
    params.push(patientId);
  }
  sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;

  const result = await db.query(sql, params);
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

// Create plan
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = await createPool(c.env);

  const planResult = await db.query(
    `INSERT INTO exercise_plans (patient_id, created_by, name, description, status, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      body.patient_id,
      body.created_by ?? user.uid,
      body.name,
      body.description ?? null,
      body.status ?? "ativo",
      body.start_date ?? null,
      body.end_date ?? null,
    ],
  );
  const plan = planResult.rows[0];

  // Insert items if provided
  const items: Array<{
    exercise_id?: string;
    order_index?: number;
    sets?: number;
    repetitions?: number;
    duration?: number;
    notes?: string;
  }> = body.items ?? [];
  let insertedItems: unknown[] = [];
  if (items.length > 0) {
    const itemResults = await Promise.all(
      items.map((item, idx) =>
        db.query(
          `INSERT INTO exercise_plan_items (plan_id, exercise_id, order_index, sets, repetitions, duration, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [
            plan.id,
            item.exercise_id ?? null,
            item.order_index ?? idx,
            item.sets ?? null,
            item.repetitions ?? null,
            item.duration ?? null,
            item.notes ?? null,
          ],
        ),
      ),
    );
    insertedItems = itemResults.map((r) => r.rows[0]);
  }

  return c.json({ data: { ...plan, items: insertedItems } }, 201);
});

// Update plan
app.patch("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = await createPool(c.env);

  const allowed = ["name", "description", "status", "start_date", "end_date"];
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = $${idx++}`);
      params.push(body[key]);
    }
  }
  if (!sets.length) return c.json({ error: "No fields to update" }, 400);
  sets.push(`updated_at = NOW()`);
  params.push(id);

  const result = await db.query(
    `UPDATE exercise_plans SET ${sets.join(", ")} WHERE id = $${idx++} RETURNING *`,
    params,
  );
  if (!result.rowCount) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// Delete plan (cascades to items)
app.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const db = await createPool(c.env);
  await db.query(`DELETE FROM exercise_plans WHERE id = $1`, [id]);
  return c.json({ ok: true });
});

// GET /api/exercise-plans/:id/compliance — taxa de adesão ao plano HEP
app.get("/:id/compliance", requireAuth, async (c) => {
  const planId = c.req.param("id");
  const db = await createPool(c.env);

  // Buscar plano + exercícios
  const planResult = await db.query(
    `SELECT p.*, array_agg(i.exercise_id) FILTER (WHERE i.id IS NOT NULL) AS exercise_ids
     FROM exercise_plans p
     LEFT JOIN exercise_plan_items i ON i.plan_id = p.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [planId],
  );

  if (!planResult.rows.length) return c.json({ error: "Plano não encontrado" }, 404);
  const plan = planResult.rows[0];

  const startDate = plan.start_date ? new Date(plan.start_date) : new Date(plan.created_at);
  const endDate = plan.end_date ? new Date(plan.end_date) : new Date();
  const totalDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  // Buscar sessões de exercício vinculadas ao paciente no período
  const sessionsResult = await db.query(
    `SELECT exercise_id, DATE(created_at) AS session_date, completed
     FROM exercise_sessions
     WHERE patient_id = $1
       AND created_at >= $2
       AND created_at <= $3
     ORDER BY session_date`,
    [plan.patient_id, startDate.toISOString(), endDate.toISOString()],
  );

  const sessions = sessionsResult.rows || [];
  const exerciseIds: string[] = plan.exercise_ids ?? [];

  // Calcular compliance por exercício
  const byExercise: Record<string, { completed: number; total: number; rate: number }> = {};
  for (const exId of exerciseIds) {
    const exSessions = sessions.filter((s: any) => s.exercise_id === exId);
    const completedCount = exSessions.filter((s: any) => s.completed).length;
    byExercise[exId] = {
      completed: completedCount,
      total: totalDays,
      rate: totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0,
    };
  }

  // Dias com pelo menos 1 exercício completado
  const completedDays = new Set(
    sessions
      .filter((s: any) => s.completed)
      .map((s: any) => s.session_date?.toString?.()?.slice(0, 10) ?? ""),
  ).size;

  const rate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // Últimos 14 dias para gráfico
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const hasSession = sessions.some(
      (s: any) => s.completed && s.session_date?.toString?.()?.slice(0, 10) === dateStr,
    );
    return { date: dateStr, completed: hasSession };
  });

  return c.json({
    data: {
      planId,
      patientId: plan.patient_id,
      planName: plan.name,
      totalDays,
      completedDays,
      rate,
      byExercise,
      last14Days: last14,
    },
  });
});

// Generate HEP exercises with bibliographic evidence for a plan
app.post("/:id/generate-hep", requireAuth, async (c) => {
  const planId = c.req.param("id");
  const db = await createPool(c.env);

  // Fetch the plan with patient info
  const planResult = await db.query(
    `SELECT ep.*, p.main_condition, p.diagnosis
     FROM exercise_plans ep
     LEFT JOIN patients p ON p.id = ep.patient_id
     WHERE ep.id = $1`,
    [planId],
  );
  if (!planResult.rows.length) return c.json({ error: "Plan not found" }, 404);

  const plan = planResult.rows[0];
  const diagnosis = plan.main_condition || plan.diagnosis || plan.name || "";

  // Query FisioBrain for supporting evidence
  let evidenceContext = "";
  let evidenceRefs: Array<{ title: string; source: string }> = [];
  if (diagnosis && c.env.AI_SEARCH) {
    try {
      const searchRes = await c.env.AI_SEARCH.search({
        messages: [
          { role: "system", content: "You are a physiotherapy evidence search assistant." },
          { role: "user", content: `exercises and protocols for: ${diagnosis}` },
        ],
      });
      const sources = (searchRes as any).data || (searchRes as any).sources || [];
      evidenceRefs = sources.slice(0, 3).map((s: any) => ({
        title: s.title || s.filename || "Fonte clínica",
        source: s.metadata?.source || "protocol",
      }));
      if (evidenceRefs.length) {
        evidenceContext = `\n\nEvidências disponíveis:\n${evidenceRefs.map((r) => `- ${r.title} (${r.source})`).join("\n")}`;
      }
    } catch {
      // non-critical
    }
  }

  const prompt = `Você é um fisioterapeuta especialista. Gere um HEP (Home Exercise Program) para um paciente com: ${diagnosis || "condição não especificada"}.${evidenceContext}

Retorne SOMENTE JSON válido neste formato:
{
  "exercises": [
    {
      "name": "nome do exercício",
      "description": "descrição detalhada",
      "sets": 3,
      "repetitions": 10,
      "duration_seconds": null,
      "frequency": "diário",
      "notes": "observações opcionais"
    }
  ],
  "general_instructions": "instruções gerais",
  "evidence_references": [{"title": "título", "source": "tipo"}]
}

Inclua 4-6 exercícios baseados em evidência. Use as referências fornecidas quando disponíveis.`;

  const aiResult = await callAI(c.env, {
    task: "hep-generation",
    prompt,
    organizationId: (c.get("user") as any)?.org_id,
  });

  let parsed: any = {};
  try {
    const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    parsed = { exercises: [], general_instructions: aiResult.content };
  }

  // Merge evidence refs from FisioBrain if AI didn't include them
  if (evidenceRefs.length && (!parsed.evidence_references || !parsed.evidence_references.length)) {
    parsed.evidence_references = evidenceRefs;
  }

  return c.json({ data: parsed });
});

// Add item to plan
app.post("/:id/items", requireAuth, async (c) => {
  const planId = c.req.param("id");
  const body = await c.req.json();
  const db = await createPool(c.env);

  const result = await db.query(
    `INSERT INTO exercise_plan_items (plan_id, exercise_id, order_index, sets, repetitions, duration, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      planId,
      body.exercise_id ?? null,
      body.order_index ?? 0,
      body.sets ?? null,
      body.repetitions ?? null,
      body.duration ?? null,
      body.notes ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

export { app as exercisePlansRoutes };
