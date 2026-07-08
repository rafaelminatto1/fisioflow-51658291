import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthUser } from "../lib/auth";
import type { Env } from "../types/env";
import type { WhatsAppQueuePayload } from "../queue";

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// ===== RECUPERAÇÃO PÓS-ALTA COM IA =====

/**
 * GET /api/post-discharge/at-risk
 *
 * Retorna pacientes que receberam alta há 25-35 dias (janela ótima de follow-up)
 * e ainda não agendaram nova sessão.
 *
 * Detecta alta via:
 *   - appointments com status 'alta' / 'discharged' / 'completed' na janela de 25-35 dias atrás
 * Detecta "sem nova sessão" via:
 *   - nenhum appointment futuro (date >= TODAY) para o mesmo paciente/org
 */
app.get("/at-risk", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);

  try {
    const result = await pool.query(
      `
        SELECT DISTINCT ON (a.patient_id)
          a.id AS discharge_appointment_id,
          a.patient_id,
          a.date AS discharge_date,
          p.full_name AS patient_name,
          p.phone AS patient_phone,
          p.email AS patient_email,
          EXTRACT(DAY FROM NOW() - a.date::timestamp) AS days_since_discharge
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.organization_id = $1
          AND a.deleted_at IS NULL
          AND a.status::text IN ('alta', 'discharged', 'completed')
          AND a.date BETWEEN CURRENT_DATE - INTERVAL '35 days' AND CURRENT_DATE - INTERVAL '25 days'
          AND NOT EXISTS (
            SELECT 1 FROM appointments future
            WHERE future.patient_id = a.patient_id
              AND future.organization_id = a.organization_id
              AND future.date >= CURRENT_DATE
              AND future.deleted_at IS NULL
              AND future.status::text NOT IN ('cancelado', 'cancelled', 'cancelled_by_patient')
          )
        ORDER BY a.patient_id, a.date DESC
      `,
      [user.organizationId],
    );

    const rows = result.rows.map((row: any) => ({
      discharge_appointment_id: row.discharge_appointment_id,
      patient_id: row.patient_id,
      patient_name: row.patient_name ?? null,
      patient_phone: row.patient_phone ?? null,
      patient_email: row.patient_email ?? null,
      discharge_date: row.discharge_date instanceof Date
        ? row.discharge_date.toISOString().split("T")[0]
        : String(row.discharge_date ?? "").slice(0, 10),
      days_since_discharge: Number(row.days_since_discharge ?? 0),
      risk_level: "medium", // janela 25-35 dias = risco moderado de não retorno
    }));

    return c.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error("[PostDischarge] GET /at-risk error:", error);
    return c.json({ error: "Falha ao buscar pacientes pós-alta" }, 500);
  }
});

/**
 * POST /api/post-discharge/trigger-followup
 * Body: { patientId: string }
 *
 * Envia mensagem WhatsApp de check-in para o paciente:
 * "Oi [Nome]! Faz 1 mês desde sua alta. Como você está? Sua dor (0-10)?"
 *
 * Usa BACKGROUND_QUEUE (mesmo padrão do cron.ts) para envio assíncrono.
 */
app.post("/trigger-followup", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);

  let body: { patientId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { patientId } = body;
  if (!patientId) {
    return c.json({ error: "patientId é obrigatório" }, 400);
  }

  // Verificar que o paciente pertence à organização (multi-tenant)
  const patientRes = await pool.query(
    `SELECT id, full_name, phone FROM patients WHERE id = $1 AND organization_id = $2 AND is_active = true LIMIT 1`,
    [patientId, user.organizationId],
  );

  const patient = patientRes.rows[0];
  if (!patient) {
    return c.json({ error: "Paciente não encontrado" }, 404);
  }

  if (!patient.phone) {
    return c.json({ error: "Paciente não possui telefone cadastrado" }, 400);
  }

  const firstName = (patient.full_name as string).split(" ")[0];

  const messageText =
    `Oi, ${firstName}! 👋 Faz cerca de 1 mês desde sua alta. Como você está? ` +
    `Em uma escala de 0 a 10, como está sua dor hoje? ` +
    `Se precisar de mais sessões, estamos aqui para te ajudar! 💙`;

  // Disparar via BACKGROUND_QUEUE (mesmo padrão do cron.ts)
  if (env_has_queue(c.env)) {
    const queuePayload: WhatsAppQueuePayload = {
      to: patient.phone,
      templateName: "pos_alta_checkin",
      languageCode: "pt_BR",
      bodyParameters: [
        { type: "text", text: firstName },
      ],
      organizationId: user.organizationId,
      patientId,
      messageText,
      appointmentId: "", // follow-up pós-alta não tem appointment associado
    };

    await c.env.BACKGROUND_QUEUE.send({ type: "SEND_WHATSAPP", payload: queuePayload });
  }

  // Log direto na tabela whatsapp_messages para rastreabilidade
  await pool.query(
    `INSERT INTO whatsapp_messages (organization_id, patient_id, from_phone, to_phone, message, type, status, metadata, created_at, updated_at)
     VALUES ($1, $2, 'clinic', $3, $4, 'pos_alta_checkin', $5, $6, NOW(), NOW())`,
    [
      user.organizationId,
      patientId,
      patient.phone,
      messageText,
      env_has_queue(c.env) ? "queued" : "pending",
      JSON.stringify({
        trigger: "post_discharge_reactivation",
        triggered_by: user.uid,
        patient_name: patient.full_name,
      }),
    ],
  );

  // Tentar registrar log de reativação (sem falhar se tabela não existir)
  try {
    await pool.query(
      `INSERT INTO reactivation_contacts (organization_id, patient_id, contact_type, message, triggered_by, created_at)
       VALUES ($1, $2, 'whatsapp_checkin', $3, $4, NOW())`,
      [user.organizationId, patientId, messageText, user.uid],
    );
  } catch {
    // Tabela reactivation_contacts pode não existir — fallback silencioso
    console.warn("[PostDischarge] reactivation_contacts insert skipped (table may not exist)");
  }

  return c.json({
    ok: true,
    message: "Mensagem de follow-up agendada com sucesso",
    patient_name: patient.full_name,
    phone: patient.phone,
  });
});

/** Helper: verifica se a BACKGROUND_QUEUE está disponível no env */
function env_has_queue(env: Env): boolean {
  return Boolean((env as any).BACKGROUND_QUEUE);
}

export { app as postDischargeReactivationRoutes };
