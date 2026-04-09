import { broadcastToOrg } from "../lib/realtime";
import type { Env } from "../types/env";

export async function announceViewing(
	env: Env,
	orgId: string,
	conversationId: string,
	userId: string,
): Promise<void> {
	try {
		await broadcastToOrg(env, orgId, {
			type: "whatsapp_viewing",
			conversationId,
			userId,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[collision-detection] announceViewing error:", error);
	}
}

export async function announceTyping(
	env: Env,
	orgId: string,
	conversationId: string,
	userId: string,
): Promise<void> {
	try {
		await broadcastToOrg(env, orgId, {
			type: "whatsapp_typing",
			conversationId,
			userId,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[collision-detection] announceTyping error:", error);
	}
}

export async function announceStoppedTyping(
	env: Env,
	orgId: string,
	conversationId: string,
	userId: string,
): Promise<void> {
	try {
		await broadcastToOrg(env, orgId, {
			type: "whatsapp_stopped_typing",
			conversationId,
			userId,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[collision-detection] announceStoppedTyping error:", error);
	}
}

export async function getActiveViewers(
	_env: Env,
	_orgId: string,
	_conversationId: string,
): Promise<Array<{ userId: string; timestamp: string }>> {
	return [];
}
