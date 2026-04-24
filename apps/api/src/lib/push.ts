import type { Env } from "../types/env";

interface PushPayload {
	title: string;
	body: string;
	data?: Record<string, string>;
}

// Push real ainda não está ativado. Fase 2.5 do roadmap implementa:
// - iOS: APNs HTTP/2 direto do Worker
// - Android: FCM HTTP v1 API (FCM como transporte, sem SDK Firebase)
// Até lá, estes helpers apenas registram a intenção de envio.

export async function sendPushBatch(
	_env: Env,
	tokens: string[],
	payload: PushPayload,
) {
	if (!tokens || tokens.length === 0) return;

	console.log(
		`[PushBatch] stub — registraria ${tokens.length} dispositivos: "${payload.title}"`,
	);

	return tokens.map((token) => ({ success: true, token }));
}

export async function notifyOrganization(
	env: Env,
	pool: any,
	organizationId: string,
	payload: PushPayload,
) {
	try {
		const result = await pool.query(
			`SELECT token FROM fcm_tokens WHERE tenant_id = $1 AND active = true`,
			[organizationId],
		);

		const tokens = (result.rows || []).map((r: any) => r.token);
		if (tokens.length > 0) {
			return await sendPushBatch(env, tokens, payload);
		}
	} catch (error) {
		console.error("[NotifyOrg] Erro ao buscar tokens:", error);
	}
}

export async function notifyUser(
	env: Env,
	pool: any,
	userId: string,
	payload: PushPayload,
) {
	try {
		const result = await pool.query(
			`SELECT token FROM fcm_tokens WHERE user_id = $1 AND active = true`,
			[userId],
		);

		const tokens = (result.rows || []).map((r: any) => r.token);
		if (tokens.length > 0) {
			return await sendPushBatch(env, tokens, payload);
		}
	} catch (error) {
		console.error("[NotifyUser] Erro ao buscar tokens:", error);
	}
}
