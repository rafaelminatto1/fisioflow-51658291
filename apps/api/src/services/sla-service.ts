import { createPool } from "../lib/db";
import { broadcastToOrg } from "../lib/realtime";
import type { Env } from "../types/env";

type Pool = ReturnType<typeof createPool>;

export async function startSlaTracking(
	pool: Pool,
	conversationId: string,
	orgId: string,
	priority: string = "normal",
): Promise<void> {
	try {
		const configResult = await pool.query(
			`SELECT * FROM wa_sla_config
       WHERE org_id = $1 AND priority = $2 AND active = true
       LIMIT 1`,
			[orgId, priority],
		);

		if (configResult.rows.length === 0) return;

		const config = configResult.rows[0];
		const firstResponseMinutes = config.first_response_minutes ?? 60;
		const nextResponseMinutes = config.next_response_minutes ?? 30;
		const resolutionMinutes = config.resolution_minutes ?? 1440;

		const businessStart = config.business_start_hour ?? 8;
		const businessEnd = config.business_end_hour ?? 18;
		const businessDays = config.business_days ?? [1, 2, 3, 4, 5];

		const now = new Date();

		const firstResponseTarget = calculateBusinessTarget(
			now,
			firstResponseMinutes,
			businessStart,
			businessEnd,
			businessDays,
		);
		const nextResponseTarget = calculateBusinessTarget(
			now,
			nextResponseMinutes,
			businessStart,
			businessEnd,
			businessDays,
		);
		const resolutionTarget = calculateBusinessTarget(
			now,
			resolutionMinutes,
			businessStart,
			businessEnd,
			businessDays,
		);

		await pool.query(
			`INSERT INTO wa_sla_tracking (
        conversation_id, org_id, priority,
        first_response_target_at, next_response_target_at, resolution_target_at,
        started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (conversation_id) DO UPDATE SET
        priority = $3,
        first_response_target_at = $4,
        next_response_target_at = $5,
        resolution_target_at = $6,
        started_at = now(),
        first_response_at = NULL,
        next_response_at = NULL,
        resolved_at = NULL`,
			[
				conversationId,
				orgId,
				priority,
				firstResponseTarget,
				nextResponseTarget,
				resolutionTarget,
			],
		);
	} catch (error) {
		console.error("[sla-service] startSlaTracking error:", error);
	}
}

export async function checkSlaBreaches(pool: Pool, env: Env): Promise<number> {
	try {
		const breaches = await pool.query(
			`SELECT st.*, c.org_id
       FROM wa_sla_tracking st
       JOIN wa_conversations c ON c.id = st.conversation_id
       WHERE st.first_response_at IS NULL
         AND st.first_response_target_at < now()
         AND st.breach_notified_first = false
       ORDER BY st.first_response_target_at ASC`,
		);

		const nextBreaches = await pool.query(
			`SELECT st.*, c.org_id
       FROM wa_sla_tracking st
       JOIN wa_conversations c ON c.id = st.conversation_id
       WHERE st.first_response_at IS NOT NULL
         AND st.next_response_at IS NULL
         AND st.next_response_target_at < now()
         AND st.breach_notified_next = false
       ORDER BY st.next_response_target_at ASC`,
		);

		const resolutionBreaches = await pool.query(
			`SELECT st.*, c.org_id
       FROM wa_sla_tracking st
       JOIN wa_conversations c ON c.id = st.conversation_id
       WHERE st.resolved_at IS NULL
         AND st.resolution_target_at < now()
         AND st.breach_notified_resolution = false
       ORDER BY st.resolution_target_at ASC`,
		);

		let totalBreaches = 0;

		for (const breach of breaches.rows) {
			await pool.query(
				`UPDATE wa_sla_tracking SET breach_notified_first = true WHERE conversation_id = $1`,
				[breach.conversation_id],
			);
			await broadcastToOrg(env, breach.org_id, {
				type: "whatsapp_sla_breach",
				slaType: "first_response",
				conversationId: breach.conversation_id,
				targetAt: breach.first_response_target_at,
				timestamp: new Date().toISOString(),
			});
			totalBreaches++;
		}

		for (const breach of nextBreaches.rows) {
			await pool.query(
				`UPDATE wa_sla_tracking SET breach_notified_next = true WHERE conversation_id = $1`,
				[breach.conversation_id],
			);
			await broadcastToOrg(env, breach.org_id, {
				type: "whatsapp_sla_breach",
				slaType: "next_response",
				conversationId: breach.conversation_id,
				targetAt: breach.next_response_target_at,
				timestamp: new Date().toISOString(),
			});
			totalBreaches++;
		}

		for (const breach of resolutionBreaches.rows) {
			await pool.query(
				`UPDATE wa_sla_tracking SET breach_notified_resolution = true WHERE conversation_id = $1`,
				[breach.conversation_id],
			);
			await broadcastToOrg(env, breach.org_id, {
				type: "whatsapp_sla_breach",
				slaType: "resolution",
				conversationId: breach.conversation_id,
				targetAt: breach.resolution_target_at,
				timestamp: new Date().toISOString(),
			});
			totalBreaches++;
		}

		return totalBreaches;
	} catch (error) {
		console.error("[sla-service] checkSlaBreaches error:", error);
		return 0;
	}
}

export async function markFirstResponse(
	pool: Pool,
	conversationId: string,
): Promise<void> {
	try {
		await pool.query(
			`UPDATE wa_sla_tracking SET first_response_at = now() WHERE conversation_id = $1`,
			[conversationId],
		);
	} catch (error) {
		console.error("[sla-service] markFirstResponse error:", error);
	}
}

export async function markNextResponse(
	pool: Pool,
	conversationId: string,
): Promise<void> {
	try {
		await pool.query(
			`UPDATE wa_sla_tracking SET next_response_at = now() WHERE conversation_id = $1`,
			[conversationId],
		);
	} catch (error) {
		console.error("[sla-service] markNextResponse error:", error);
	}
}

export async function markResolved(
	pool: Pool,
	conversationId: string,
): Promise<void> {
	try {
		await pool.query(
			`UPDATE wa_sla_tracking SET resolved_at = now() WHERE conversation_id = $1`,
			[conversationId],
		);
	} catch (error) {
		console.error("[sla-service] markResolved error:", error);
	}
}

function calculateBusinessTarget(
	start: Date,
	minutes: number,
	businessStart: number,
	businessEnd: number,
	businessDays: number[],
): Date {
	let remaining = minutes;
	let current = new Date(start);

	while (remaining > 0) {
		const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
		if (!businessDays.includes(dayOfWeek)) {
			current.setDate(current.getDate() + 1);
			current.setHours(businessStart, 0, 0, 0);
			continue;
		}

		const hour = current.getHours();
		if (hour < businessStart) {
			current.setHours(businessStart, 0, 0, 0);
		} else if (hour >= businessEnd) {
			current.setDate(current.getDate() + 1);
			current.setHours(businessStart, 0, 0, 0);
			continue;
		}

		const endOfDay = new Date(current);
		endOfDay.setHours(businessEnd, 0, 0, 0);
		const availableMinutes = (endOfDay.getTime() - current.getTime()) / 60000;

		if (remaining <= availableMinutes) {
			return new Date(current.getTime() + remaining * 60000);
		}

		remaining -= availableMinutes;
		current.setDate(current.getDate() + 1);
		current.setHours(businessStart, 0, 0, 0);
	}

	return current;
}
