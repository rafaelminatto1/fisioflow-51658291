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
  phone: string;
  name: string | null;
}

// $3 = onlyEngaged: quando true, só contatos que JÁ conversaram no WhatsApp
// (reduz risco de spam/queda de qualidade do número — recomendação Meta).
const WHERE = `l.organization_id = $1
    AND (cardinality($2::text[]) = 0 OR l.estagio = ANY($2))
    AND COALESCE(l.telefone, c.telefone) IS NOT NULL
    AND COALESCE(l.telefone, c.telefone) <> ''
    AND ($3::boolean = false OR EXISTS (
      SELECT 1 FROM whatsapp_contacts wc
      JOIN wa_conversations wconv ON wconv.contact_id = wc.id
      WHERE wc.organization_id = l.organization_id
        AND regexp_replace(wc.wa_id, '[^0-9]', '', 'g')
            = regexp_replace(COALESCE(l.telefone, c.telefone), '[^0-9]', '', 'g')
    ))`;

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
    const r = await pool.query(
      `SELECT COUNT(DISTINCT COALESCE(l.contact_id::text, l.id::text))::int AS c
         FROM leads l
         LEFT JOIN contacts c ON c.id = l.contact_id
        WHERE ${WHERE}`,
      params,
    );
    return { count: r.rows[0]?.c ?? 0, rows: [] };
  }

  const r = await pool.query(
    `SELECT DISTINCT ON (COALESCE(l.contact_id::text, l.id::text))
        l.contact_id, COALESCE(l.telefone, c.telefone) AS phone, COALESCE(l.nome, c.nome) AS name
       FROM leads l
       LEFT JOIN contacts c ON c.id = l.contact_id
      WHERE ${WHERE}
      ORDER BY COALESCE(l.contact_id::text, l.id::text)
      LIMIT 2000`,
    params,
  );
  return { count: r.rows.length, rows: r.rows as AudienceRecipient[] };
}
