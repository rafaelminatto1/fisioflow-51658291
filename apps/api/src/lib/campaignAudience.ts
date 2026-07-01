/**
 * Audiência de campanhas WhatsApp — orientada a CONTATO (padrão HubSpot/Kommo/
 * Respond.io): o público é o segmento de leads/contatos por estágio do funil, e o
 * telefone vem do próprio cadastro (leads.telefone → contacts.telefone). Cobre
 * leads que ainda não viraram pacientes.
 */
import type { DbPool } from "./db";

export function normalizeStages(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((s) => String(s ?? "").trim()).filter(Boolean);
}

export interface AudienceRecipient {
  contact_id: string | null;
  patient_id: string | null;
  phone: string;
  name: string | null;
}

// Base de telefones do público: pacientes + contatos do CRM + quem já conversou
// no WhatsApp (dedup por dígitos). Cobre clínicas que não usam a tabela `leads`.
// $1 = org, $2 = estágios (opcional; filtra por leads quando houver),
// $3 = onlyEngaged (só quem já conversou — recomendação anti-spam Meta).
const BASE_CTE = `
  WITH base AS (
    SELECT regexp_replace(p.phone, '[^0-9]', '', 'g') AS d, NULL::uuid AS contact_id,
           p.id AS patient_id, p.phone AS phone, p.full_name AS name
      FROM patients p
     WHERE p.organization_id = $1 AND p.phone ~ '[0-9]'
    UNION ALL
    SELECT regexp_replace(c.telefone, '[^0-9]', '', 'g'), c.id, NULL, c.telefone, c.nome
      FROM contacts c
     WHERE c.organization_id = $1 AND c.deleted_at IS NULL AND c.telefone ~ '[0-9]'
    UNION ALL
    SELECT regexp_replace(wc.wa_id, '[^0-9]', '', 'g'), NULL, wc.patient_id, wc.wa_id,
           COALESCE(wc.display_name, wc.username, wc.wa_id)
      FROM whatsapp_contacts wc
     WHERE wc.organization_id = $1 AND wc.wa_id ~ '[0-9]'
  ),
  filtered AS (
    SELECT DISTINCT ON (b.d) b.d, b.contact_id, b.patient_id, b.phone, b.name
      FROM base b
     WHERE b.d <> ''
       AND ($3::boolean = false OR EXISTS (
         SELECT 1 FROM whatsapp_contacts wc2
         JOIN wa_conversations wv ON wv.contact_id = wc2.id
         WHERE wc2.organization_id = $1
           AND regexp_replace(wc2.wa_id, '[^0-9]', '', 'g') = b.d))
       AND (cardinality($2::text[]) = 0 OR EXISTS (
         SELECT 1 FROM leads l
         WHERE l.organization_id = $1 AND l.estagio = ANY($2)
           AND regexp_replace(COALESCE(l.telefone, ''), '[^0-9]', '', 'g') = b.d))
       -- Política LGPD: respeitar opt-out. Exclui telefones de pacientes que
       -- revogaram/desativaram o consentimento de marketing.
       AND NOT EXISTS (
         SELECT 1 FROM patients p2
         JOIN marketing_consents mc ON mc.patient_id = p2.id
         WHERE p2.organization_id = $1
           AND regexp_replace(COALESCE(p2.phone, ''), '[^0-9]', '', 'g') = b.d
           AND (mc.is_active = false OR mc.revoked_at IS NOT NULL))
     ORDER BY b.d
  )`;

/**
 * Resolve a audiência (ou só a contagem) de uma campanha a partir dos estágios
 * do funil. Dedup por contato (ou lead, quando sem contato vinculado).
 */
export async function fetchCampaignAudience(
  pool: DbPool,
  orgId: string,
  stages: unknown,
  opts: { countOnly?: boolean; onlyEngaged?: boolean } = {},
): Promise<{ count: number; rows: AudienceRecipient[] }> {
  const norm = normalizeStages(stages);
  const params = [orgId, norm, opts.onlyEngaged === true];

  if (opts.countOnly) {
    const r = await pool.query(`${BASE_CTE} SELECT COUNT(*)::int AS c FROM filtered`, params);
    return { count: r.rows[0]?.c ?? 0, rows: [] };
  }

  const r = await pool.query(
    `${BASE_CTE} SELECT contact_id, patient_id, phone, name FROM filtered LIMIT 2000`,
    params,
  );
  return { count: r.rows.length, rows: r.rows as AudienceRecipient[] };
}
