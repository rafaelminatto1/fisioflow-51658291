import type { Env } from "../types/env";

const API_BASE = "https://graph.facebook.com/v25.0";

interface ReplyButton {
	id: string;
	title: string;
}

interface ListRow {
	id: string;
	title: string;
	description?: string;
}

interface ListSection {
	title: string;
	rows: ListRow[];
}

interface ReplyButtonOptions {
	header?: string;
	footer?: string;
	bsuid?: string;
}

interface ListMessageOptions {
	header?: string;
	footer?: string;
	bsuid?: string;
}

interface FlowMessageOptions {
	flowToken?: string;
	flowAction?: string;
	flowActionPayload?: Record<string, unknown>;
	header?: string;
	footer?: string;
	bsuid?: string;
}

async function sendToMeta(env: Env, payload: Record<string, unknown>) {
	const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
	const token = env.WHATSAPP_ACCESS_TOKEN;

	if (!phoneId || !token) {
		console.warn("[WhatsApp Interactive] Credentials missing");
		return { error: "Credentials missing" };
	}

	const endpoint = `${API_BASE}/${phoneId}/messages`;

	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	const result = await response.json();
	if (!response.ok) {
		console.error("[WhatsApp Interactive Error]", result);
	}
	return result;
}

export async function sendReplyButtons(
	env: Env,
	to: string,
	bodyText: string,
	buttons: ReplyButton[],
	options?: ReplyButtonOptions,
) {
	const payload: Record<string, unknown> = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: to.replace(/\D/g, ""),
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: bodyText },
			action: {
				buttons: buttons.slice(0, 3).map((btn) => ({
					type: "reply",
					reply: { id: btn.id, title: btn.title.slice(0, 20) },
				})),
			},
		},
	};

	if (options?.bsuid) {
		(payload as any).recipient = options.bsuid;
	}

	const interactive = payload.interactive as Record<string, unknown>;
	if (options?.header) {
		interactive.header = { type: "text", text: options.header };
	}
	if (options?.footer) {
		interactive.footer = { text: options.footer };
	}

	return sendToMeta(env, payload);
}

export async function sendListMessage(
	env: Env,
	to: string,
	bodyText: string,
	buttonText: string,
	sections: ListSection[],
	options?: ListMessageOptions,
) {
	let rowCount = 0;
	const cappedSections = sections.map((section) => {
		const available = 10 - rowCount;
		const rows = section.rows.slice(0, available).map((row) => ({
			id: row.id,
			title: row.title.slice(0, 24),
			...(row.description ? { description: row.description.slice(0, 72) } : {}),
		}));
		rowCount += rows.length;
		return { title: section.title, rows };
	});

	const payload: Record<string, unknown> = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: to.replace(/\D/g, ""),
		type: "interactive",
		interactive: {
			type: "list",
			body: { text: bodyText },
			action: {
				button: buttonText,
				sections: cappedSections,
			},
		},
	};

	if (options?.bsuid) {
		(payload as any).recipient = options.bsuid;
	}

	const interactive = payload.interactive as Record<string, unknown>;
	if (options?.header) {
		interactive.header = { type: "text", text: options.header };
	}
	if (options?.footer) {
		interactive.footer = { text: options.footer };
	}

	return sendToMeta(env, payload);
}

export async function sendFlowMessage(
	env: Env,
	to: string,
	flowId: string,
	flowCta: string,
	bodyText: string,
	options?: FlowMessageOptions,
) {
	const action: Record<string, unknown> = {
		name: "flow",
		parameters: {
			flow_message_version: "3",
			flow_id: flowId,
			flow_cta: flowCta,
			flow_token: options?.flowToken ?? "unused",
			flow_action: options?.flowAction ?? "navigate",
			flow_action_payload: options?.flowActionPayload ?? {},
		},
	};

	const payload: Record<string, unknown> = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: to.replace(/\D/g, ""),
		type: "interactive",
		interactive: {
			type: "flow",
			body: { text: bodyText },
			action,
		},
	};

	if (options?.bsuid) {
		(payload as any).recipient = options.bsuid;
	}

	const interactive = payload.interactive as Record<string, unknown>;
	if (options?.header) {
		interactive.header = { type: "text", text: options.header };
	}
	if (options?.footer) {
		interactive.footer = { text: options.footer };
	}

	return sendToMeta(env, payload);
}
