import { createPool } from "../lib/db";

type Pool = ReturnType<typeof createPool>;

export async function recordOptIn(
  pool: Pool,
  orgId: string,
  contactId: string,
  channel: string,
  reason?: string,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO wa_opt_in_out (org_id, contact_id, type, channel, reason, created_at)
       VALUES ($1, $2, 'opt_in', $3, $4, now())`,
      [orgId, contactId, channel, reason ?? null],
    );
  } catch (error) {
    console.error("[compliance-service] recordOptIn error:", error);
  }
}

export async function recordOptOut(
  pool: Pool,
  orgId: string,
  contactId: string,
  channel: string,
  reason?: string,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO wa_opt_in_out (org_id, contact_id, type, channel, reason, created_at)
       VALUES ($1, $2, 'opt_out', $3, $4, now())`,
      [orgId, contactId, channel, reason ?? null],
    );
  } catch (error) {
    console.error("[compliance-service] recordOptOut error:", error);
  }
}

export async function isOptedIn(pool: Pool, orgId: string, contactId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT type FROM wa_opt_in_out
       WHERE org_id = $1 AND contact_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [orgId, contactId],
    );

    if (result.rows.length === 0) return false;
    return result.rows[0].type === "opt_in";
  } catch (error) {
    console.error("[compliance-service] isOptedIn error:", error);
    return false;
  }
}

export async function exportContactData(
  pool: Pool,
  orgId: string,
  contactId: string,
): Promise<Record<string, any>> {
  try {
    const contactResult = await pool.query(
      `SELECT * FROM whatsapp_contacts WHERE id = $1 AND org_id = $2`,
      [contactId, orgId],
    );

    if (contactResult.rows.length === 0) {
      return { error: "Contact not found" };
    }

    const contact = contactResult.rows[0];

    const conversationsResult = await pool.query(
      `SELECT * FROM wa_conversations WHERE contact_id = $1 AND org_id = $2`,
      [contactId, orgId],
    );

    const conversationIds = conversationsResult.rows.map((c: any) => c.id);

    let messages: any[] = [];
    let assignments: any[] = [];
    let notes: any[] = [];

    if (conversationIds.length > 0) {
      const messagesResult = await pool.query(
        `SELECT * FROM wa_messages WHERE conversation_id = ANY($1)`,
        [conversationIds],
      );
      messages = messagesResult.rows;

      const assignmentsResult = await pool.query(
        `SELECT * FROM wa_assignments WHERE conversation_id = ANY($1)`,
        [conversationIds],
      );
      assignments = assignmentsResult.rows;

      const notesResult = await pool.query(
        `SELECT * FROM wa_messages WHERE conversation_id = ANY($1) AND message_type = 'note'`,
        [conversationIds],
      );
      notes = notesResult.rows;
    }

    const optHistoryResult = await pool.query(
      `SELECT * FROM wa_opt_in_out WHERE contact_id = $1 AND org_id = $2 ORDER BY created_at ASC`,
      [contactId, orgId],
    );

    const accessLogResult = await pool.query(
      `SELECT * FROM wa_access_log WHERE contact_id = $1 AND org_id = $2 ORDER BY accessed_at DESC`,
      [contactId, orgId],
    );

    return {
      contact,
      conversations: conversationsResult.rows,
      messages,
      assignments,
      notes,
      optHistory: optHistoryResult.rows,
      accessLog: accessLogResult.rows,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[compliance-service] exportContactData error:", error);
    return { error: "Export failed" };
  }
}

export async function deleteContactData(
  pool: Pool,
  orgId: string,
  contactId: string,
): Promise<void> {
  try {
    await pool.query("BEGIN");

    const conversationsResult = await pool.query(
      `SELECT id FROM wa_conversations WHERE contact_id = $1 AND org_id = $2`,
      [contactId, orgId],
    );
    const conversationIds = conversationsResult.rows.map((c: any) => c.id);

    if (conversationIds.length > 0) {
      await pool.query(`DELETE FROM wa_messages WHERE conversation_id = ANY($1)`, [
        conversationIds,
      ]);

      await pool.query(`DELETE FROM wa_assignments WHERE conversation_id = ANY($1)`, [
        conversationIds,
      ]);

      await pool.query(`DELETE FROM wa_sla_tracking WHERE conversation_id = ANY($1)`, [
        conversationIds,
      ]);

      await pool.query(`DELETE FROM wa_conversations WHERE id = ANY($1)`, [conversationIds]);
    }

    await pool.query(`DELETE FROM wa_opt_in_out WHERE contact_id = $1 AND org_id = $2`, [
      contactId,
      orgId,
    ]);

    await pool.query(`DELETE FROM wa_access_log WHERE contact_id = $1 AND org_id = $2`, [
      contactId,
      orgId,
    ]);

    await pool.query(
      `UPDATE whatsapp_contacts SET
        display_name = 'Deleted User',
        phone_e164 = NULL,
        wa_id = NULL,
        bsuid = NULL,
        username = NULL,
        parent_bsuid = NULL,
        updated_at = now()
       WHERE id = $1 AND org_id = $2`,
      [contactId, orgId],
    );

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("[compliance-service] deleteContactData error:", error);
    throw error;
  }
}

export async function getAccessLog(
  pool: Pool,
  orgId: string,
  filters?: {
    contactId?: string;
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  },
): Promise<any[]> {
  try {
    const conditions: string[] = ["org_id = $1"];
    const params: any[] = [orgId];
    let idx = 2;

    if (filters?.contactId) {
      conditions.push(`contact_id = $${idx++}`);
      params.push(filters.contactId);
    }
    if (filters?.userId) {
      conditions.push(`user_id = $${idx++}`);
      params.push(filters.userId);
    }
    if (filters?.action) {
      conditions.push(`action = $${idx++}`);
      params.push(filters.action);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT * FROM wa_access_log ${where} ORDER BY accessed_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params,
    );

    return result.rows;
  } catch (error) {
    console.error("[compliance-service] getAccessLog error:", error);
    return [];
  }
}
