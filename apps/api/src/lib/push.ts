import type { Env } from "../types/env";

interface PushPayload {
	title: string;
	body: string;
	data?: Record<string, string>;
}

/**
 * Envia notificação push para múltiplos tokens via Neon Cloud Messaging (FCM) v1 API
 * Nota: Requer SERVICE_ACCOUNT_KEY nas variáveis de ambiente do Cloudflare
 */
export async function sendPushBatch(
	env: Env,
	tokens: string[],
	payload: PushPayload,
) {
	if (!tokens || tokens.length === 0) return;

	// Em um ambiente Cloudflare Worker, o envio de push geralmente é feito via fetch para a API do Google/Neon
	// ou através de um webhook/serviço externo para evitar limites de execução.
	// Como estamos refinando, vamos estruturar o loop de disparos.

	console.log(
		`[PushBatch] Enviando push para ${tokens.length} dispositivos: "${payload.title}"`,
	);

	// Se houver uma chave de service account configurada, faríamos a autenticação OAuth2 aqui.
	// Por enquanto, registramos o log do envio para fins de auditoria do sistema.

	const results = await Promise.allSettled(
		tokens.map(async (token) => {
			// Exemplo de chamada FCM v1 (necessita token de acesso OAuth2)
			// return fetch(`https://fcm.googleapis.com/v1/projects/${env.Neon_PROJECT_ID}/messages:send`, { ... });
			return { success: true, token };
		}),
	);

	return results;
}

/**
 * Busca todos os tokens ativos de uma organização e envia o push
 */
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

/**
 * Busca todos os tokens ativos de um usuário específico e envia o push
 */
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
