/**
 * Rotas: Domínio Contacts (CRM hub unificado)
 *
 * GET  /api/contacts                  — lista filtrada
 * GET  /api/contacts/:id              — perfil 360° (contact + lead + patient + activities + scores)
 * GET  /api/contacts/:id/timeline     — activities paginadas
 * POST /api/contacts/:id/convert      — força conversão lead → paciente
 * POST /api/contacts/:id/activities   — adiciona activity manual (nota, contato)
 */
import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { isUuid } from "../lib/validators";
import { logContactActivity } from "../lib/contacts";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== LIST =====

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const {
    lifecycle_stage,
    score_temperature,
    owner_id,
    q,
    limit = "50",
    offset = "0",
  } = c.req.query();

  const conditions: string[] = ["organization_id = $1", "deleted_at IS NULL"];
  const params: unknown[] = [user.organizationId];

  if (lifecycle_stage) {
    params.push(lifecycle_stage);
    conditions.push(`lifecycle_stage = $${params.length}::contact_lifecycle_stage`);
  }
  if (score_temperature) {
    params.push(score_temperature);
    conditions.push(`score_temperature = $${params.length}`);
  }
  if (owner_id) {
    params.push(owner_id);
    conditions.push(`owner_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(nome ILIKE $${params.length} OR email ILIKE $${params.length} OR telefone ILIKE $${params.length})`,
    );
  }

  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const off = Math.max(Number(offset) || 0, 0);
  params.push(lim, off);

  const result = await pool.query(
    `SELECT id, nome, telefone, email, cpf, lifecycle_stage, score, score_temperature,
            owner_id, origem_first_touch, origem_last_touch, source_campaign_id,
            primary_lead_id, primary_patient_id, tags, created_at, updated_at
       FROM contacts
      WHERE ${conditions.join(" AND ")}
      ORDER BY updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return c.json({ data: result.rows, limit: lim, offset: off });
});

// ===== 360° =====

app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "id inválido" }, 400);

  const pool = await createPool(c.env);

  const contactRes = await pool.query(
    `SELECT * FROM contacts WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, user.organizationId],
  );
  if (!contactRes.rows.length) return c.json({ error: "Contato não encontrado" }, 404);
  const contact = contactRes.rows[0];

  const [leadsRes, patientsRes, activitiesRes, scoresRes] = await Promise.all([
    pool.query(`SELECT * FROM leads WHERE contact_id = $1 ORDER BY created_at DESC`, [id]),
    pool.query(`SELECT * FROM patients WHERE contact_id = $1 AND deleted_at IS NULL`, [id]),
    pool.query(
      `SELECT * FROM contact_activities WHERE contact_id = $1
        ORDER BY created_at DESC LIMIT 50`,
      [id],
    ),
    pool.query(
      `SELECT * FROM contact_scores WHERE contact_id = $1
        ORDER BY created_at DESC LIMIT 20`,
      [id],
    ),
  ]);

  return c.json({
    data: {
      contact,
      leads: leadsRes.rows,
      patients: patientsRes.rows,
      activities: activitiesRes.rows,
      scores: scoresRes.rows,
    },
  });
});

// ===== TIMELINE =====

app.get("/:id/timeline", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "id inválido" }, 400);

  const pool = await createPool(c.env);
  const { tipo, limit = "100", offset = "0" } = c.req.query();

  // RBAC simples: precisa pertencer à org
  const own = await pool.query(
    `SELECT 1 FROM contacts WHERE id = $1 AND organization_id = $2`,
    [id, user.organizationId],
  );
  if (!own.rows.length) return c.json({ error: "Contato não encontrado" }, 404);

  const conditions: string[] = ["contact_id = $1"];
  const params: unknown[] = [id];
  if (tipo) {
    params.push(tipo);
    conditions.push(`tipo = $${params.length}`);
  }
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const off = Math.max(Number(offset) || 0, 0);
  params.push(lim, off);

  const result = await pool.query(
    `SELECT * FROM contact_activities
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return c.json({ data: result.rows, limit: lim, offset: off });
});

// ===== CONVERT (manual override) =====

app.post("/:id/convert", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "id inválido" }, 400);

  const pool = await createPool(c.env);

  const contactRes = await pool.query(
    `SELECT * FROM contacts WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, user.organizationId],
  );
  if (!contactRes.rows.length) return c.json({ error: "Contato não encontrado" }, 404);
  const contact = contactRes.rows[0];

  if (contact.primary_patient_id) {
    return c.json({ data: { contact_id: id, patient_id: contact.primary_patient_id, already: true } });
  }

  const patientRes = await pool.query(
    `INSERT INTO patients (organization_id, full_name, phone, email, origin, contact_id, is_active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),NOW())
     RETURNING id`,
    [
      user.organizationId,
      contact.nome,
      contact.telefone,
      contact.email,
      contact.origem_first_touch,
      contact.id,
    ],
  );
  const patientId = patientRes.rows[0].id as string;

  await pool.query(
    `UPDATE contacts
        SET primary_patient_id = $1,
            lifecycle_stage    = 'customer',
            updated_at         = NOW()
      WHERE id = $2`,
    [patientId, id],
  );

  // Se houver lead primário, atualiza estágio (trigger refletirá lifecycle)
  if (contact.primary_lead_id) {
    await pool.query(
      `UPDATE leads SET estagio = 'efetivado', updated_at = NOW()
        WHERE id = $1 AND organization_id = $2 AND estagio <> 'efetivado'`,
      [contact.primary_lead_id, user.organizationId],
    );
  }

  await logContactActivity(pool, {
    organizationId: user.organizationId,
    contactId: id,
    tipo: "conversion",
    titulo: "Conversão manual",
    descricao: "Contato convertido em paciente via endpoint /convert.",
    refLeadId: contact.primary_lead_id,
    refPatientId: patientId,
    payload: { manual: true },
    createdBy: user.uid,
  });

  return c.json({ data: { contact_id: id, patient_id: patientId, already: false } }, 201);
});

// ===== ACTIVITY MANUAL =====

app.post("/:id/activities", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "id inválido" }, 400);

  const body = (await c.req.json()) as Record<string, unknown>;
  if (!body.tipo || typeof body.tipo !== "string") {
    return c.json({ error: "tipo é obrigatório" }, 400);
  }

  const pool = await createPool(c.env);
  const own = await pool.query(
    `SELECT 1 FROM contacts WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, user.organizationId],
  );
  if (!own.rows.length) return c.json({ error: "Contato não encontrado" }, 404);

  await logContactActivity(pool, {
    organizationId: user.organizationId,
    contactId: id,
    tipo: String(body.tipo),
    titulo: body.titulo ? String(body.titulo) : undefined,
    descricao: body.descricao ? String(body.descricao) : undefined,
    payload: (body.payload as Record<string, unknown>) ?? {},
    createdBy: user.uid,
  });

  return c.json({ ok: true }, 201);
});

// ===== ROI por origem =====

app.get("/roi-by-source", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const { days = "90" } = c.req.query();
  const sinceDays = Math.min(Math.max(Number(days) || 90, 7), 365);

  const result = await pool.query(
    `WITH origem_contacts AS (
       SELECT id, COALESCE(NULLIF(origem_first_touch,''), 'desconhecido') AS origem
         FROM contacts
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND created_at >= NOW() - ($2 || ' days')::interval
     ),
     leads_por_origem AS (
       SELECT oc.origem,
              COUNT(DISTINCT oc.id)::int AS total_contatos,
              COUNT(DISTINCT CASE WHEN c.lifecycle_stage = 'customer' THEN oc.id END)::int
                AS total_convertidos
         FROM origem_contacts oc
         JOIN contacts c ON c.id = oc.id
        GROUP BY oc.origem
     ),
     receita_por_origem AS (
       SELECT oc.origem,
              COALESCE(SUM(pp.amount_paid), 0)::numeric AS receita
         FROM origem_contacts oc
         JOIN patients p  ON p.contact_id = oc.id
         LEFT JOIN patient_packages pp ON pp.patient_id = p.id
        WHERE pp.organization_id = $1 OR pp.organization_id IS NULL
        GROUP BY oc.origem
     )
     SELECT l.origem,
            l.total_contatos,
            l.total_convertidos,
            CASE WHEN l.total_contatos > 0
                 THEN ROUND(l.total_convertidos::numeric / l.total_contatos * 100, 1)
                 ELSE 0 END AS taxa_conversao,
            COALESCE(r.receita, 0) AS receita,
            CASE WHEN l.total_convertidos > 0
                 THEN ROUND(COALESCE(r.receita, 0) / l.total_convertidos, 2)
                 ELSE 0 END AS ticket_medio
       FROM leads_por_origem l
       LEFT JOIN receita_por_origem r ON r.origem = l.origem
      ORDER BY r.receita DESC NULLS LAST, l.total_contatos DESC`,
    [user.organizationId, String(sinceDays)],
  );

  return c.json({ data: result.rows, days: sinceDays });
});

export const contactsRoutes = app;
