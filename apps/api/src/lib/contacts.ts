/**
 * Helpers para upsert e dedup de `contacts` (CRM hub).
 *
 * Usados por rotas /api/crm/leads, /api/patients e /api/contacts para garantir
 * que toda escrita de lead/paciente cria ou liga um contact único por
 * (organization_id, phone|email|cpf normalizados).
 */
import type { DbPool } from "./db";

export type LifecycleStage = "lead" | "mql" | "sql" | "opportunity" | "customer" | "churned";

export interface ContactUpsertInput {
  organizationId: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cpf?: string | null;
  lifecycleStage?: LifecycleStage;
  ownerId?: string | null;
  origem?: string | null;
  sourceCampaignId?: string | null;
  sourceReferralCode?: string | null;
  primaryLeadId?: string | null;
  primaryPatientId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ContactRow {
  id: string;
  organization_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  lifecycle_stage: LifecycleStage;
  score: number;
  score_temperature: string | null;
  owner_id: string | null;
  primary_lead_id: string | null;
  primary_patient_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D+/g, "");
  return digits.length ? digits : null;
}

export function normalizeEmail(e?: string | null): string | null {
  if (!e) return null;
  const v = e.trim().toLowerCase();
  return v.length ? v : null;
}

export function normalizeCpf(c?: string | null): string | null {
  if (!c) return null;
  const v = c.trim();
  return v.length ? v : null;
}

/**
 * Procura contact existente por (org, telefone|email|cpf). Retorna o primeiro
 * match, na ordem CPF > telefone > email (mais forte → mais fraco).
 */
export async function findContactByIdentity(
  pool: DbPool,
  orgId: string,
  identity: { telefone?: string | null; email?: string | null; cpf?: string | null },
): Promise<ContactRow | null> {
  const tel = normalizePhone(identity.telefone);
  const mail = normalizeEmail(identity.email);
  const cpf = normalizeCpf(identity.cpf);

  if (!tel && !mail && !cpf) return null;

  const result = await pool.query<ContactRow>(
    `SELECT * FROM contacts
      WHERE organization_id = $1
        AND deleted_at IS NULL
        AND (
          ($2::text IS NOT NULL AND cpf      = $2)
       OR ($3::text IS NOT NULL AND telefone = $3)
       OR ($4::text IS NOT NULL AND email    = $4)
        )
      ORDER BY
        (cpf      = $2) DESC,
        (telefone = $3) DESC,
        (email    = $4) DESC,
        updated_at DESC
      LIMIT 1`,
    [orgId, cpf, tel, mail],
  );
  return result.rows[0] ?? null;
}

/**
 * Cria ou atualiza um contact a partir de input de lead/paciente.
 * Se já existir match por phone/email/cpf, preenche campos vazios e atualiza
 * primary_lead_id / primary_patient_id quando apropriado.
 */
export async function upsertContact(
  pool: DbPool,
  input: ContactUpsertInput,
  attempt = 0,
): Promise<ContactRow> {
  const existing = await findContactByIdentity(pool, input.organizationId, {
    telefone: input.telefone,
    email: input.email,
    cpf: input.cpf,
  });

  const tel = normalizePhone(input.telefone);
  const mail = normalizeEmail(input.email);
  const cpf = normalizeCpf(input.cpf);

  if (existing) {
    const result = await pool.query<ContactRow>(
      `UPDATE contacts SET
         nome                = COALESCE(NULLIF($2,''), nome),
         telefone            = COALESCE(telefone, $3),
         email               = COALESCE(email, $4),
         cpf                 = COALESCE(cpf, $5),
         lifecycle_stage     = COALESCE($6::contact_lifecycle_stage, lifecycle_stage),
         owner_id            = COALESCE(owner_id, $7),
         origem_last_touch   = COALESCE($8, origem_last_touch),
         source_campaign_id  = COALESCE(source_campaign_id, $9),
         source_referral_code= COALESCE(source_referral_code, $10),
         primary_lead_id     = COALESCE(primary_lead_id, $11),
         primary_patient_id  = COALESCE(primary_patient_id, $12),
         metadata            = metadata || $13::jsonb,
         updated_at          = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        existing.id,
        input.nome,
        tel,
        mail,
        cpf,
        input.lifecycleStage ?? null,
        input.ownerId ?? null,
        input.origem ?? null,
        input.sourceCampaignId ?? null,
        input.sourceReferralCode ?? null,
        input.primaryLeadId ?? null,
        input.primaryPatientId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return result.rows[0];
  }

  try {
    const result = await pool.query<ContactRow>(
      `INSERT INTO contacts (
         organization_id, nome, telefone, email, cpf,
         lifecycle_stage, owner_id,
         origem_first_touch, origem_last_touch,
         source_campaign_id, source_referral_code,
         primary_lead_id, primary_patient_id, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13::jsonb)
       RETURNING *`,
      [
        input.organizationId,
        input.nome,
        tel,
        mail,
        cpf,
        input.lifecycleStage ?? "lead",
        input.ownerId ?? null,
        input.origem ?? null,
        input.sourceCampaignId ?? null,
        input.sourceReferralCode ?? null,
        input.primaryLeadId ?? null,
        input.primaryPatientId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return result.rows[0];
  } catch (err) {
    // Race: outro request inseriu o mesmo phone/email/cpf entre find e insert.
    // Retry 1x: agora findContactByIdentity vai achar o registro recém-criado.
    if (attempt < 1 && (err as { code?: string }).code === "23505" /* unique_violation */) {
      return upsertContact(pool, input, attempt + 1);
    }
    throw err;
  }
}

/**
 * Insere uma activity na timeline do contato. Não falha caller se der erro
 * (log warn) — timeline é best-effort.
 */
export async function logContactActivity(
  pool: DbPool,
  args: {
    organizationId: string;
    contactId: string;
    tipo: string;
    titulo?: string;
    descricao?: string;
    refLeadId?: string | null;
    refPatientId?: string | null;
    refAppointmentId?: string | null;
    refSessionId?: string | null;
    refCampaignId?: string | null;
    refAutomationId?: string | null;
    payload?: Record<string, unknown>;
    createdBy?: string | null;
  },
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO contact_activities (
         organization_id, contact_id, tipo, titulo, descricao,
         ref_lead_id, ref_patient_id, ref_appointment_id, ref_session_id,
         ref_campaign_id, ref_automation_id, payload, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)`,
      [
        args.organizationId,
        args.contactId,
        args.tipo,
        args.titulo ?? null,
        args.descricao ?? null,
        args.refLeadId ?? null,
        args.refPatientId ?? null,
        args.refAppointmentId ?? null,
        args.refSessionId ?? null,
        args.refCampaignId ?? null,
        args.refAutomationId ?? null,
        JSON.stringify(args.payload ?? {}),
        args.createdBy ?? null,
      ],
    );
  } catch (err) {
    console.warn("[contacts] logContactActivity failed:", err);
  }
}
