import { createPool } from "./db";
import type { Env } from "../types/env";

type Pool = ReturnType<typeof createPool>;

export async function resolveOrCreateContact(
	pool: Pool,
	orgId: string,
	waId: string,
	bsuid: string | null,
	parentBsuid: string | null,
	username: string | null,
	displayName: string | null,
) {
	try {
		let contact =
			(await findContactByBsuid(pool, orgId, bsuid)) ??
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
				if (bsuid && contact.bsuid !== bsuid)
					changes.bsuid = { old: contact.bsuid, new: bsuid };
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
				if (waId && contact.wa_id !== waId)
					changes.wa_id = { old: contact.wa_id, new: waId };

				if (Object.keys(changes).length > 0) {
					await pool.query(
						`INSERT INTO identity_history (contact_id, organization_id, changes) VALUES ($1, $2, $3)`,
						[contact.id, orgId, JSON.stringify(changes)],
					);
				}

				const refreshed = await pool.query(
					`SELECT * FROM whatsapp_contacts WHERE id = $1`,
					[contact.id],
				);
				return refreshed.rows[0];
			}

			return contact;
		}

		const insertResult = await pool.query(
			`INSERT INTO whatsapp_contacts (organization_id, wa_id, bsuid, parent_bsuid, username, display_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
			[orgId, waId, bsuid, parentBsuid, username, displayName],
		);

		return insertResult.rows[0];
	} catch (error) {
		console.error("[whatsapp-identity] resolveOrCreateContact error:", error);
		throw error;
	}
}

export async function linkContactToPatient(
	pool: Pool,
	contactId: string,
	patientId: string,
) {
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

export async function findContactByPhone(
	pool: Pool,
	orgId: string,
	phone: string,
) {
	try {
		const cleaned = phone.replace(/\D/g, "");
		const result = await pool.query(
			`SELECT * FROM whatsapp_contacts WHERE organization_id = $1 AND wa_id = $2 LIMIT 1`,
			[orgId, cleaned],
		);
		return result.rows[0] ?? null;
	} catch (error) {
		console.error("[whatsapp-identity] findContactByPhone error:", error);
		return null;
	}
}

export async function findContactByBsuid(
	pool: Pool,
	orgId: string,
	bsuid: string | null,
) {
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
