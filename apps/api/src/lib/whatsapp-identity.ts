import { createPool } from "./db";

type Pool = ReturnType<typeof createPool>;

/** True para strings só-dígitos com comprimento de telefone (10–13). Exclui IGSIDs (16–17) e webchat ("web:uuid"). */
function looksLikePhone(value: string): boolean {
  return /^\d{10,13}$/.test(value);
}

/**
 * Normaliza um número brasileiro para E.164 (com 55), preservando o 9º dígito —
 * usado como wa_id de armazenamento, para que lead manual ("11993524642") e
 * inbound da Meta ("5511993524642") convirjam no MESMO contato.
 * Não-telefones (IGSID, "web:uuid") são retornados intactos.
 */
export function toE164Brazil(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!looksLikePhone(digits)) return String(raw ?? "");
  let national = digits;
  if (national.length >= 12 && national.startsWith("55")) {
    national = national.slice(2);
  }
  // national agora deve ser DDD(2) + assinante (8 ou 9 dígitos) = 10 ou 11.
  if (national.length === 10 || national.length === 11) {
    return "55" + national;
  }
  return digits;
}

/**
 * Chave canônica para COMPARAÇÃO (dedup): remove 55 e o 9º dígito de celular,
 * de modo que "11993524642", "5511993524642" e "551193524642" colidam.
 * Não-telefones retornam só os dígitos.
 */
export function canonicalBrazilPhone(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!looksLikePhone(digits)) return digits;
  let national = digits;
  if (national.length >= 12 && national.startsWith("55")) {
    national = national.slice(2);
  }
  if (national.length === 10 || national.length === 11) {
    const ddd = national.slice(0, 2);
    let sub = national.slice(2); // 8 ou 9 dígitos
    if (sub.length === 9 && sub.startsWith("9")) {
      sub = sub.slice(1); // descarta o 9º dígito p/ casar variantes
    }
    return "55" + ddd + sub;
  }
  return digits;
}

export async function resolveOrCreateContact(
  pool: Pool,
  orgId: string,
  waId: string,
  bsuid: string | null,
  parentBsuid: string | null,
  username: string | null,
  displayName: string | null,
  avatarUrl: string | null = null,
) {
  try {
    // Normaliza telefone BR para E.164 (com 55) — converge lead manual e inbound
    // no mesmo contato. Não-telefones (IGSID/webchat) passam intactos.
    waId = toE164Brazil(waId);

    let contact =
      (await findContactByBsuid(pool, orgId, bsuid)) ??
      (await findContactByWaId(pool, orgId, waId)) ??
      (await findContactByPhone(pool, orgId, waId));

    if (contact) {
      const updates: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (bsuid && contact.bsuid !== bsuid) {
        updates.push(`bsuid = $${idx++}`);
        params.push(bsuid);
      }
      if (parentBsuid && contact.parent_bsuid !== parentBsuid) {
        updates.push(`parent_bsuid = $${idx++}`);
        params.push(parentBsuid);
      }
      if (username && contact.username !== username) {
        updates.push(`username = $${idx++}`);
        params.push(username);
      }
      if (displayName && contact.display_name !== displayName) {
        updates.push(`display_name = $${idx++}`);
        params.push(displayName);
      }
      if (avatarUrl && contact.avatar_url !== avatarUrl) {
        updates.push(`avatar_url = $${idx++}`);
        params.push(avatarUrl);
      }
      if (waId && contact.wa_id !== waId) {
        updates.push(`wa_id = $${idx++}`);
        params.push(waId);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = now()`);
        params.push(contact.id);
        await pool.query(
          `UPDATE whatsapp_contacts SET ${updates.join(", ")} WHERE id = $${idx}`,
          params,
        );

        const changes: Record<string, { old: any; new: any }> = {};
        if (bsuid && contact.bsuid !== bsuid) changes.bsuid = { old: contact.bsuid, new: bsuid };
        if (parentBsuid && contact.parent_bsuid !== parentBsuid)
          changes.parent_bsuid = {
            old: contact.parent_bsuid,
            new: parentBsuid,
          };
        if (username && contact.username !== username)
          changes.username = { old: contact.username, new: username };
        if (displayName && contact.display_name !== displayName)
          changes.display_name = {
            old: contact.display_name,
            new: displayName,
          };
        if (avatarUrl && contact.avatar_url !== avatarUrl)
          changes.avatar_url = {
            old: contact.avatar_url,
            new: avatarUrl,
          };
        if (waId && contact.wa_id !== waId) changes.wa_id = { old: contact.wa_id, new: waId };

        if (Object.keys(changes).length > 0) {
          await pool.query(
            `INSERT INTO identity_history (contact_id, organization_id, changes) VALUES ($1, $2, $3)`,
            [contact.id, orgId, JSON.stringify(changes)],
          );
        }

        const refreshed = await pool.query(`SELECT * FROM whatsapp_contacts WHERE id = $1`, [
          contact.id,
        ]);
        return refreshed.rows[0];
      }

      return contact;
    }

    const insertResult = await pool.query(
      `INSERT INTO whatsapp_contacts (organization_id, wa_id, bsuid, parent_bsuid, username, display_name, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orgId, waId, bsuid, parentBsuid, username, displayName, avatarUrl],
    );

    return insertResult.rows[0];
  } catch (error) {
    console.error("[whatsapp-identity] resolveOrCreateContact error:", error);
    throw error;
  }
}

export async function linkContactToPatient(pool: Pool, contactId: string, patientId: string) {
  try {
    const result = await pool.query(
      `UPDATE whatsapp_contacts SET patient_id = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [patientId, contactId],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[whatsapp-identity] linkContactToPatient error:", error);
    throw error;
  }
}

/** Busca por wa_id EXATO (sem remover não-dígitos) — essencial p/ webchat ("web:uuid"). */
export async function findContactByWaId(pool: Pool, orgId: string, waId: string) {
  try {
    const result = await pool.query(
      `SELECT * FROM whatsapp_contacts WHERE organization_id = $1 AND wa_id = $2 LIMIT 1`,
      [orgId, waId],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[whatsapp-identity] findContactByWaId error:", error);
    return null;
  }
}

export async function findContactByPhone(pool: Pool, orgId: string, phone: string) {
  try {
    const cleaned = phone.replace(/\D/g, "");

    // 1) Match exato (back-compat: IGSID, webchat numérico, dados já E.164).
    const exact = await pool.query(
      `SELECT * FROM whatsapp_contacts WHERE organization_id = $1 AND wa_id = $2 LIMIT 1`,
      [orgId, cleaned],
    );
    if (exact.rows[0]) return exact.rows[0];

    // 2) Match canônico p/ telefones BR — pega dados legados (sem 55) e variações
    //    do 9º dígito. Busca candidatos pelos 8 últimos dígitos e confirma em JS.
    const canon = canonicalBrazilPhone(phone);
    if (canon.startsWith("55") && canon.length === 12) {
      const sub8 = canon.slice(4); // 8 dígitos do assinante
      const candidates = await pool.query(
        `SELECT * FROM whatsapp_contacts
         WHERE organization_id = $1
           AND regexp_replace(wa_id, '\\D', '', 'g') LIKE '%' || $2`,
        [orgId, sub8],
      );
      const match = candidates.rows.find(
        (row: { wa_id?: string }) => canonicalBrazilPhone(String(row.wa_id ?? "")) === canon,
      );
      if (match) return match;
    }

    return null;
  } catch (error) {
    console.error("[whatsapp-identity] findContactByPhone error:", error);
    return null;
  }
}

export async function findContactByBsuid(pool: Pool, orgId: string, bsuid: string | null) {
  if (!bsuid) return null;
  try {
    const result = await pool.query(
      `SELECT * FROM whatsapp_contacts WHERE organization_id = $1 AND bsuid = $2 LIMIT 1`,
      [orgId, bsuid],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[whatsapp-identity] findContactByBsuid error:", error);
    return null;
  }
}
