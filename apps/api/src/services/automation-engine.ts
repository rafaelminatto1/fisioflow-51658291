import { createPool } from "../lib/db";
import { broadcastToOrg } from "../lib/realtime";
import {
	addMessage,
	assignConversation,
	updateConversationStatus,
} from "../lib/whatsapp-conversations";
import {
	sendReplyButtons,
	sendListMessage,
	sendFlowMessage,
} from "../lib/whatsapp-interactive";
import type { Env } from "../types/env";

type Pool = ReturnType<typeof createPool>;

interface AutomationCondition {
	field: string;
	operator: "eq" | "neq" | "contains" | "gt" | "lt" | "in";
	value: any;
}

interface AutomationAction {
	type:
		| "send_message"
		| "send_template"
		| "send_interactive"
		| "assign_to"
		| "add_tag"
		| "change_status"
		| "trigger_flow"
		| "notify";
	config: Record<string, any>;
}

interface AutomationRule {
	id: string;
	org_id: string;
	trigger_type: string;
	conditions: AutomationCondition[];
	actions: AutomationAction[];
	priority: number;
}

interface TriggerData {
	orgId: string;
	conversationId: string;
	contactId?: string;
	message?: Record<string, any>;
	patientId?: string;
}

interface ActionContext {
	orgId: string;
	conversationId: string;
	contactId?: string;
	message?: Record<string, any>;
	patientId?: string;
}

export async function processAutomationTriggers(
	pool: Pool,
	env: Env,
	triggerType: string,
	triggerData: TriggerData,
): Promise<void> {
	try {
		const rulesResult = await pool.query(
			`SELECT * FROM wa_automation_rules
       WHERE org_id = $1 AND trigger_type = $2 AND active = true
       ORDER BY priority ASC`,
			[triggerData.orgId, triggerType],
		);

		if (rulesResult.rows.length === 0) return;

		const context: ActionContext = {
			orgId: triggerData.orgId,
			conversationId: triggerData.conversationId,
			contactId: triggerData.contactId,
			message: triggerData.message,
			patientId: triggerData.patientId,
		};

		for (const row of rulesResult.rows) {
			const rule: AutomationRule = {
				id: row.id,
				org_id: row.org_id,
				trigger_type: row.trigger_type,
				conditions: row.conditions ?? [],
				actions: row.actions ?? [],
				priority: row.priority,
			};

			const allConditionsMet = rule.conditions.every((cond) =>
				evaluateCondition(cond, triggerData),
			);

			if (!allConditionsMet) continue;

			for (const action of rule.actions) {
				try {
					await executeAction(pool, env, action, context);
				} catch (actionError) {
					console.error(
						"[automation-engine] action execution error:",
						actionError,
					);
				}
			}

			await pool.query(
				`INSERT INTO wa_automation_logs (rule_id, org_id, conversation_id, trigger_type, executed_at)
         VALUES ($1, $2, $3, $4, now())`,
				[rule.id, triggerData.orgId, triggerData.conversationId, triggerType],
			);
		}
	} catch (error) {
		console.error(
			"[automation-engine] processAutomationTriggers error:",
			error,
		);
	}
}

export function evaluateCondition(
	condition: AutomationCondition,
	data: TriggerData,
): boolean {
	const fieldValue = getNestedField(data, condition.field);

	switch (condition.operator) {
		case "eq":
			return fieldValue === condition.value;
		case "neq":
			return fieldValue !== condition.value;
		case "contains":
			if (typeof fieldValue === "string") {
				return fieldValue.includes(String(condition.value));
			}
			if (Array.isArray(fieldValue)) {
				return fieldValue.includes(condition.value);
			}
			return false;
		case "gt":
			return typeof fieldValue === "number" && fieldValue > condition.value;
		case "lt":
			return typeof fieldValue === "number" && fieldValue < condition.value;
		case "in":
			return (
				Array.isArray(condition.value) && condition.value.includes(fieldValue)
			);
		default:
			return false;
	}
}

function getNestedField(obj: any, path: string): any {
	const keys = path.split(".");
	let current = obj;
	for (const key of keys) {
		if (current == null || typeof current !== "object") return undefined;
		current = current[key];
	}
	return current;
}

export async function executeAction(
	pool: Pool,
	env: Env,
	action: AutomationAction,
	context: ActionContext,
): Promise<void> {
	switch (action.type) {
		case "send_message": {
			const contactResult = await pool.query(
				`SELECT wa_id FROM whatsapp_contacts WHERE id = $1 LIMIT 1`,
				[context.contactId],
			);
			if (contactResult.rows.length === 0) break;

			const waId = contactResult.rows[0].wa_id;
			const text = interpolateTemplate(action.config.text ?? "", context);

			const payload = {
				messaging_product: "whatsapp",
				recipient_type: "individual",
				to: waId?.replace(/\D/g, ""),
				type: "text",
				text: { body: text },
			};

			const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
			const token = env.WHATSAPP_ACCESS_TOKEN;
			if (phoneId && token) {
				await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});
			}

			await addMessage(
				pool,
				context.conversationId,
				context.orgId,
				context.contactId ?? "",
				"outbound",
				"system",
				"automation",
				"text",
				text,
			);
			break;
		}

		case "send_template": {
			const contactResult = await pool.query(
				`SELECT wa_id FROM whatsapp_contacts WHERE id = $1 LIMIT 1`,
				[context.contactId],
			);
			if (contactResult.rows.length === 0) break;

			const waId = contactResult.rows[0].wa_id;
			const templateName = action.config.templateName ?? "";
			const language = action.config.language ?? "pt_BR";
			const components = action.config.components ?? [];

			const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
			const token = env.WHATSAPP_ACCESS_TOKEN;
			if (phoneId && token) {
				await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						messaging_product: "whatsapp",
						to: waId?.replace(/\D/g, ""),
						type: "template",
						template: {
							name: templateName,
							language: { code: language },
							components,
						},
					}),
				});
			}

			await addMessage(
				pool,
				context.conversationId,
				context.orgId,
				context.contactId ?? "",
				"outbound",
				"system",
				"automation",
				"template",
				JSON.stringify({ templateName, language }),
				undefined,
				{ templateName },
			);
			break;
		}

		case "send_interactive": {
			const contactResult = await pool.query(
				`SELECT wa_id FROM whatsapp_contacts WHERE id = $1 LIMIT 1`,
				[context.contactId],
			);
			if (contactResult.rows.length === 0) break;

			const waId = contactResult.rows[0].wa_id;
			const interactiveType = action.config.interactiveType ?? "button";
			const bodyText = interpolateTemplate(
				action.config.bodyText ?? "",
				context,
			);

			if (interactiveType === "button") {
				await sendReplyButtons(
					env,
					waId,
					bodyText,
					action.config.buttons ?? [],
					{ footer: action.config.footer },
				);
			} else if (interactiveType === "list") {
				await sendListMessage(
					env,
					waId,
					bodyText,
					action.config.buttonText ?? "Opções",
					action.config.sections ?? [],
					{ footer: action.config.footer },
				);
			}
			break;
		}

		case "assign_to": {
			const assigneeId = action.config.profileId;
			const team = action.config.team ?? null;
			if (assigneeId) {
				await assignConversation(
					pool,
					context.conversationId,
					assigneeId,
					"automation",
					team,
				);
			}
			break;
		}

		case "add_tag": {
			const tag = action.config.tag;
			if (tag) {
				await pool.query(
					`UPDATE wa_conversations SET tags = array_append(COALESCE(tags, '{}'), $1), updated_at = now() WHERE id = $2`,
					[tag, context.conversationId],
				);
			}
			break;
		}

		case "change_status": {
			const newStatus = action.config.status;
			if (newStatus) {
				await updateConversationStatus(pool, context.conversationId, newStatus);
			}
			break;
		}

		case "trigger_flow": {
			const contactResult = await pool.query(
				`SELECT wa_id FROM whatsapp_contacts WHERE id = $1 LIMIT 1`,
				[context.contactId],
			);
			if (contactResult.rows.length === 0) break;

			const waId = contactResult.rows[0].wa_id;
			const flowId = action.config.flowId ?? "";
			const flowCta = action.config.flowCta ?? "Iniciar";
			const bodyText = interpolateTemplate(
				action.config.bodyText ?? "",
				context,
			);

			await sendFlowMessage(env, waId, flowId, flowCta, bodyText, {
				flowToken: action.config.flowToken,
				flowAction: action.config.flowAction,
				flowActionPayload: action.config.flowActionPayload,
				header: action.config.header,
				footer: action.config.footer,
			});
			break;
		}

		case "notify": {
			await broadcastToOrg(env, context.orgId, {
				type: "whatsapp_automation",
				action: action.config.notificationType ?? "generic",
				conversationId: context.conversationId,
				message: interpolateTemplate(
					action.config.notificationMessage ?? "",
					context,
				),
				timestamp: new Date().toISOString(),
			});
			break;
		}
	}
}

function interpolateTemplate(template: string, context: ActionContext): string {
	return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		if (key === "orgId") return context.orgId;
		if (key === "conversationId") return context.conversationId;
		if (key === "contactId") return context.contactId ?? "";
		if (key === "patientId") return context.patientId ?? "";
		if (context.message && key in context.message)
			return String(context.message[key]);
		return match;
	});
}
