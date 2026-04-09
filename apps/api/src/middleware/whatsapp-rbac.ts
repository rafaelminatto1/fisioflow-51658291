import type { MiddlewareHandler } from "hono";
import type { Env } from "../types/env";
import type { AuthUser } from "../lib/auth";
import { createPool } from "../lib/db";

const WHATSAPP_PERMISSIONS: Record<string, string[]> = {
	admin: [
		"whatsapp:view_all",
		"whatsapp:view_assigned",
		"whatsapp:send_message",
		"whatsapp:use_templates",
		"whatsapp:send_interactive",
		"whatsapp:manage_templates",
		"whatsapp:assign",
		"whatsapp:transfer",
		"whatsapp:manage_team",
		"whatsapp:view_clinical",
		"whatsapp:view_financial",
		"whatsapp:manage_automations",
		"whatsapp:view_dashboard",
		"whatsapp:send_off_window",
		"whatsapp:add_notes",
	],
	fisioterapeuta: [
		"whatsapp:view_assigned",
		"whatsapp:send_message",
		"whatsapp:use_templates",
		"whatsapp:send_interactive",
		"whatsapp:transfer",
		"whatsapp:view_clinical",
		"whatsapp:view_dashboard",
		"whatsapp:add_notes",
	],
	estagiario: [
		"whatsapp:view_assigned",
		"whatsapp:send_message",
		"whatsapp:use_templates",
		"whatsapp:add_notes",
	],
	recepcionista: [
		"whatsapp:view_all",
		"whatsapp:view_assigned",
		"whatsapp:send_message",
		"whatsapp:use_templates",
		"whatsapp:send_interactive",
		"whatsapp:assign",
		"whatsapp:transfer",
		"whatsapp:view_financial",
		"whatsapp:view_dashboard",
		"whatsapp:add_notes",
	],
};

export function requireWhatsAppPermission(
	permission: string,
): MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthUser } }> {
	return async (c, next) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
		}

		try {
			const pool = createPool(c.env);
			const profileResult = await pool.query(
				`SELECT role FROM profiles WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
				[user.uid, user.organizationId],
			);

			if (profileResult.rows.length === 0) {
				return c.json({ error: "Profile not found", code: "FORBIDDEN" }, 403);
			}

			const role = profileResult.rows[0].role;
			const permissions = WHATSAPP_PERMISSIONS[role] ?? [];

			if (!permissions.includes(permission)) {
				return c.json(
					{
						error: "Insufficient permissions",
						code: "FORBIDDEN",
						required: permission,
					},
					403,
				);
			}

			await next();
		} catch (error) {
			console.error("[whatsapp-rbac] requireWhatsAppPermission error:", error);
			return c.json(
				{ error: "Internal server error", code: "INTERNAL_ERROR" },
				500,
			);
		}
	};
}

export async function getUserWhatsAppPermissions(
	pool: ReturnType<typeof createPool>,
	userId: string,
	orgId: string,
): Promise<string[]> {
	try {
		const result = await pool.query(
			`SELECT role FROM profiles WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
			[userId, orgId],
		);

		if (result.rows.length === 0) return [];
		const role = result.rows[0].role;
		return WHATSAPP_PERMISSIONS[role] ?? [];
	} catch (error) {
		console.error("[whatsapp-rbac] getUserWhatsAppPermissions error:", error);
		return [];
	}
}

export async function hasWhatsAppPermission(
	pool: ReturnType<typeof createPool>,
	userId: string,
	orgId: string,
	permission: string,
): Promise<boolean> {
	const permissions = await getUserWhatsAppPermissions(pool, userId, orgId);
	return permissions.includes(permission);
}

export async function getScopedConversationsFilter(
	pool: ReturnType<typeof createPool>,
	userId: string,
	orgId: string,
): Promise<{ where: string; params: any[] }> {
	try {
		const profileResult = await pool.query(
			`SELECT id, role FROM profiles WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
			[userId, orgId],
		);

		if (profileResult.rows.length === 0) {
			return { where: "1 = 0", params: [] };
		}

		const profile = profileResult.rows[0];
		const profileId = profile.id;
		const role = profile.role;

		if (role === "admin") {
			return { where: "c.org_id = $1", params: [orgId] };
		}

		if (role === "fisioterapeuta" || role === "estagiario") {
			return {
				where: `c.org_id = $1 AND (c.assigned_to = $2 OR EXISTS (
          SELECT 1 FROM patients p
          JOIN whatsapp_contacts wc ON wc.patient_id = p.id
          WHERE wc.id = c.contact_id AND p.professional_id = $2
        ))`,
				params: [orgId, profileId],
			};
		}

		if (role === "recepcionista") {
			return {
				where: `c.org_id = $1 AND (
          c.assigned_to = $2
          OR c.assigned_to IS NULL
          OR EXISTS (
            SELECT 1 FROM wa_assignments wa
            WHERE wa.conversation_id = c.id AND wa.team = 'recepcao'
          )
        )`,
				params: [orgId, profileId],
			};
		}

		return {
			where: "c.org_id = $1 AND c.assigned_to = $2",
			params: [orgId, profileId],
		};
	} catch (error) {
		console.error("[whatsapp-rbac] getScopedConversationsFilter error:", error);
		return { where: "1 = 0", params: [] };
	}
}
