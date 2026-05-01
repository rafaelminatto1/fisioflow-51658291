import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.query();
  const db = await createPool(c.env);

  let sql = `SELECT * FROM treatment_cycles WHERE therapist_id = $1`;
  const params: unknown[] = [user.uid];
  let idx = 2;

  if (patientId) {
    sql += ` AND patient_id = $${idx++}`;
    params.push(patientId);
  }
  sql += " ORDER BY created_at DESC";

  const result = await db.query(sql, params);
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = await createPool(c.env);

  const result = await db.query(
    `INSERT INTO treatment_cycles
       (patient_id, therapist_id, title, description, status, start_date, end_date, goals, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      body.patient_id ?? body.patientId,
      body.therapistId ?? user.uid,
      body.title,
      body.description ?? null,
      body.status ?? "active",
      body.start_date ?? body.startDate ?? null,
      body.end_date ?? body.endDate ?? null,
      JSON.stringify(body.goals ?? []),
      JSON.stringify(body.metadata ?? {}),
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.patch("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = await createPool(c.env);

  const allowed = ["title", "description", "status", "start_date", "end_date", "goals", "metadata"];
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    const bodyKey =
      key === "start_date"
        ? key in body
          ? key
          : "startDate"
        : key === "end_date"
          ? key in body
            ? key
            : "endDate"
          : key;
    const val = body[key] ?? body[bodyKey];
    if (val !== undefined) {
      const dbVal = ["goals", "metadata"].includes(key) ? JSON.stringify(val) : val;
      sets.push(`${key} = $${idx++}`);
      params.push(dbVal);
    }
  }
  if (!sets.length) return c.json({ error: "No fields to update" }, 400);
  sets.push(`updated_at = NOW()`);
  params.push(id);

  const result = await db.query(
    `UPDATE treatment_cycles SET ${sets.join(", ")} WHERE id = $${idx++} RETURNING *`,
    params,
  );
  if (!result.rowCount) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const db = await createPool(c.env);
  await db.query(`DELETE FROM treatment_cycles WHERE id = $1`, [id]);
  return c.json({ ok: true });
});

// POST /api/treatment-cycles/:id/close — Close cycle + generate discharge report HTML → R2
app.post("/:id/close", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = createPool(c.env);

  // Fetch cycle with patient info
  const cycleRes = await db.query(
    `SELECT tc.*, p.full_name, p.date_of_birth, p.main_condition
     FROM treatment_cycles tc
     JOIN patients p ON p.id = tc.patient_id
     WHERE tc.id = $1 AND tc.therapist_id = $2 LIMIT 1`,
    [id, user.uid],
  );
  if (!cycleRes.rows.length) return c.json({ error: "Ciclo não encontrado" }, 404);
  const cycle = cycleRes.rows[0] as Record<string, unknown>;

  // Fetch latest sessions
  const sessionsRes = await db.query(
    `SELECT s.id, s.session_date, s.subjective, s.assessment, s.plan
     FROM sessions s
     WHERE s.patient_id = $1 AND s.organization_id = $2
     ORDER BY s.session_date ASC LIMIT 30`,
    [cycle.patient_id, user.organizationId],
  ).catch(() => ({ rows: [] }));

  // Fetch last active exercise plan
  const hepRes = await db.query(
    `SELECT ep.id, ep.title, json_agg(json_build_object(
        'name', e.name, 'sets', epi.sets, 'reps', epi.reps
      )) AS exercises
     FROM exercise_plans ep
     JOIN exercise_plan_items epi ON epi.plan_id = ep.id
     JOIN exercises e ON e.id = epi.exercise_id
     WHERE ep.patient_id = $1 AND ep.status = 'active'
     GROUP BY ep.id, ep.title LIMIT 1`,
    [cycle.patient_id],
  ).catch(() => ({ rows: [] }));

  const sessions = sessionsRes.rows as Record<string, unknown>[];
  const hep = hepRes.rows[0] as Record<string, unknown> | undefined;
  const today = new Date().toLocaleDateString("pt-BR");
  const patientAge = cycle.date_of_birth
    ? Math.floor((Date.now() - new Date(String(cycle.date_of_birth)).getTime()) / (365.25 * 24 * 3600000))
    : null;

  // Generate HTML report
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Alta — ${cycle.full_name}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1a1a1a; }
  h1 { color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; }
  h2 { color: #374151; margin-top: 24px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; }
  .meta div { background: #f3f4f6; padding: 8px 12px; border-radius: 4px; }
  .meta strong { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td, th { padding: 6px 10px; text-align: left; border: 1px solid #e5e7eb; font-size: 13px; }
  th { background: #eff6ff; font-weight: 600; }
  .footer { margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px; color: #6b7280; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Relatório de Alta Fisioterapêutica</h1>
<div class="meta">
  <div><strong>Paciente</strong>${cycle.full_name}</div>
  ${patientAge ? `<div><strong>Idade</strong>${patientAge} anos</div>` : ""}
  <div><strong>Diagnóstico / CID</strong>${cycle.main_condition ?? cycle.diagnosis ?? "—"}</div>
  <div><strong>Data da Alta</strong>${today}</div>
  <div><strong>Total de sessões</strong>${sessions.length}</div>
  ${cycle.start_date ? `<div><strong>Período</strong>${new Date(String(cycle.start_date)).toLocaleDateString("pt-BR")} — ${today}</div>` : ""}
</div>

${sessions.length > 0 ? `
<h2>Evolução Clínica</h2>
<table>
<tr><th>Data</th><th>Subjetivo (S)</th><th>Avaliação (A)</th></tr>
${sessions.slice(0, 5).map((s) => `<tr>
  <td>${s.session_date ? new Date(String(s.session_date)).toLocaleDateString("pt-BR") : "—"}</td>
  <td>${String(s.subjective ?? "").substring(0, 120)}</td>
  <td>${String(s.assessment ?? "").substring(0, 120)}</td>
</tr>`).join("")}
</table>
` : ""}

${hep ? `
<h2>Plano de Alta (HEP)</h2>
<p><strong>${hep.title}</strong></p>
<table>
<tr><th>Exercício</th><th>Séries × Reps</th></tr>
${Array.isArray(hep.exercises) ? hep.exercises.map((e: any) =>
  `<tr><td>${e.name}</td><td>${e.sets ?? 3}×${e.reps ?? 10}</td></tr>`
).join("") : ""}
</table>
` : ""}

<div class="footer">
  <p>Gerado automaticamente pelo FisioFlow em ${today}.</p>
  ${cycle.cref ? `<p>CRF: ${cycle.cref}</p>` : ""}
</div>
</body>
</html>`;

  // Save to R2 if available
  let reportUrl: string | null = null;
  if (c.env.MEDIA_BUCKET) {
    const key = `reports/discharge/${id}.html`;
    await c.env.MEDIA_BUCKET.put(key, html, {
      httpMetadata: { contentType: "text/html;charset=UTF-8" },
    });
    reportUrl = c.env.R2_PUBLIC_URL ? `${c.env.R2_PUBLIC_URL}/${key}` : null;
  }

  // Mark cycle as completed
  await db.query(
    `UPDATE treatment_cycles SET status = 'completed', end_date = NOW(), report_url = $1, updated_at = NOW() WHERE id = $2`,
    [reportUrl, id],
  ).catch(async () => {
    // report_url column might not exist
    await db.query(
      `ALTER TABLE treatment_cycles ADD COLUMN IF NOT EXISTS report_url TEXT`,
    );
    await db.query(
      `UPDATE treatment_cycles SET status = 'completed', end_date = NOW(), report_url = $1, updated_at = NOW() WHERE id = $2`,
      [reportUrl, id],
    );
  });

  return c.json({ success: true, data: { reportUrl } });
});

// GET /api/treatment-cycles/:id/report — Return discharge report URL
app.get("/:id/report", requireAuth, async (c) => {
  const id = c.req.param("id");
  const db = createPool(c.env);

  const res = await db.query(
    `SELECT id, status, report_url FROM treatment_cycles WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (!res.rows.length) return c.json({ error: "Ciclo não encontrado" }, 404);
  const row = res.rows[0] as Record<string, unknown>;

  if (!row.report_url) return c.json({ error: "Relatório ainda não gerado" }, 404);
  return c.json({ data: { reportUrl: row.report_url, status: row.status } });
});

export { app as treatmentCyclesRoutes };
