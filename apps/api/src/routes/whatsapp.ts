import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb, createPool } from "../lib/db";
import { requireAuth, type AuthUser } from "../lib/auth";
import type { Env } from "../types/env";
import { writeEvent } from "../lib/analytics";

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

const DEFAULT_TEMPLATES = [
	{
		id: "confirmacao_agendamento",
		name: "Confirmacao de agendamento",
		template_key: "confirmacao_agendamento",
		content:
			"Ola {{name}}, sua sessao com {{therapist}} foi confirmada para {{date}} as {{time}}.",
		variables: ["name", "therapist", "date", "time"],
		category: "appointment",
		status: "ativo",
	},
	{
		id: "lembrete_sessao",
		name: "Lembrete de sessao",
		template_key: "lembrete_sessao",
		content: "Lembrete: sua sessao sera as {{time}} com {{therapist}}.",
		variables: ["time", "therapist"],
		category: "reminder",
		status: "ativo",
	},
	{
		id: "cancelamento",
		name: "Cancelamento",
		template_key: "cancelamento",
		content:
			"Sua sessao do dia {{date}} foi cancelada. Entre em contato para reagendar.",
		variables: ["date"],
		category: "appointment",
		status: "ativo",
	},
	{
		id: "prescricao",
		name: "Prescricao",
		template_key: "prescricao",
		content: "Sua prescricao esta disponivel em {{link}}.",
		variables: ["link"],
		category: "clinical",
		status: "ativo",
	},
	{
		id: "solicitar_confirmacao",
		name: "Solicitar confirmacao",
		template_key: "solicitar_confirmacao",
		content: "Ola {{name}}, confirme sua sessao em {{date}} as {{time}}.",
		variables: ["name", "date", "time"],
		category: "appointment",
		status: "ativo",
	},
	{
		id: "oferta_vaga",
		name: "Oferta de vaga",
		template_key: "oferta_vaga",
		content:
			"Temos uma vaga em {{date}} as {{time}} com {{therapist}}. Responda em ate {{expires}} horas.",
		variables: ["date", "time", "therapist", "expires"],
		category: "waitlist",
		status: "ativo",
	},
] as const;

function getStoredTemplates(settings: Record<string, unknown>) {
	const rawTemplates = settings.whatsapp_templates;
	if (Array.isArray(rawTemplates) && rawTemplates.length > 0) {
		return [...(rawTemplates as Array<Record<string, unknown>>)];
	}
	return DEFAULT_TEMPLATES.map((template) => ({ ...template }));
}

function extractTemplateVariables(content: string) {
	return Array.from(content.matchAll(/\{\{([^}]+)\}\}/g))
		.map((match) => match[1]?.trim())
		.filter((value): value is string => Boolean(value))
		.filter((value, index, values) => values.indexOf(value) === index);
}

function getString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeStoredTemplateForResponse(
	template: Record<string, unknown>,
) {
	const content = getString(template.body) ?? getString(template.content) ?? "";
	const templateKey = getString(template.template_key);
	const name = getString(template.name) ?? templateKey ?? "Template sem nome";
	const variables = Array.isArray(template.variables)
		? template.variables.filter(
				(variable): variable is string => typeof variable === "string",
			)
		: extractTemplateVariables(content);

	return {
		...template,
		id: getString(template.id) ?? templateKey ?? name,
		name,
		template_key: templateKey,
		content,
		body: content,
		variables,
		category: getString(template.category) ?? "general",
		status: getString(template.status) ?? "ativo",
		language: getString(template.language) ?? "pt_BR",
		isLocal:
			Boolean(template.isLocal) ||
			Boolean(template.localOnly) ||
			Boolean(templateKey),
		createdAt: getString(template.createdAt) ?? getString(template.created_at),
		updatedAt: getString(template.updatedAt) ?? getString(template.updated_at),
	};
}

function slugifyTemplateKey(name: string) {
	const slug = name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");

	return slug || `template_${Date.now()}`;
}

async function saveOrganizationSettings(
	pool: ReturnType<typeof createPool>,
	organizationId: string,
	settings: Record<string, unknown>,
) {
	await pool.query(
		`UPDATE organizations SET settings = $1::jsonb, updated_at = NOW() WHERE id = $2`,
		[JSON.stringify(settings), organizationId],
	);
}

async function loadOrganizationSettings(
	pool: ReturnType<typeof createPool>,
	organizationId: string,
) {
	try {
		const result = await pool.query(
			`SELECT settings FROM organizations WHERE id = $1 LIMIT 1`,
			[organizationId],
		);
		const raw = result.rows[0]?.settings;
		if (!raw || typeof raw !== "object") return {};
		return raw as Record<string, unknown>;
	} catch (error) {
		console.error("[whatsapp] loadOrganizationSettings fallback:", error);
		return {};
	}
}

app.get("/config", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const settings = await loadOrganizationSettings(pool, user.organizationId);
	const config = (settings.whatsapp_config as Record<string, unknown>) ?? {
		enabled: false,
	};
	return c.json({ data: config });
});

app.get("/templates", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const settings = await loadOrganizationSettings(pool, user.organizationId);
	const templates = getStoredTemplates(settings).map(
		normalizeStoredTemplateForResponse,
	);
	return c.json({ data: templates });
});

app.put("/templates/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const { id } = c.req.param();
	const body = (await c.req.json()) as {
		name?: string;
		content?: string;
		body?: string;
		category?: string;
		status?: string;
		template_key?: string;
		variables?: string[];
	};
	const nextContent = body.content ?? body.body;

	if (
		body.name === undefined &&
		nextContent === undefined &&
		body.category === undefined &&
		body.status === undefined &&
		body.template_key === undefined &&
		body.variables === undefined
	) {
		return c.json({ error: "Nenhum campo para atualizar" }, 400);
	}

	const settings = await loadOrganizationSettings(pool, user.organizationId);
	const existingTemplates = getStoredTemplates(settings);

	const currentIndex = existingTemplates.findIndex(
		(template) => String(template.id) === id,
	);
	if (currentIndex === -1) {
		return c.json({ error: "Template nao encontrado" }, 404);
	}

	existingTemplates[currentIndex] = {
		...existingTemplates[currentIndex],
		...(body.name !== undefined ? { name: body.name.trim() } : {}),
		...(nextContent !== undefined ? { content: nextContent } : {}),
		...(body.category !== undefined ? { category: body.category } : {}),
		...(body.status !== undefined ? { status: body.status } : {}),
		...(body.template_key !== undefined
			? { template_key: body.template_key.trim() }
			: {}),
		...(body.variables !== undefined
			? { variables: body.variables }
			: nextContent !== undefined
				? { variables: extractTemplateVariables(nextContent) }
				: {}),
		updated_at: new Date().toISOString(),
	};

	const nextSettings = {
		...settings,
		whatsapp_templates: existingTemplates,
	};

	await saveOrganizationSettings(pool, user.organizationId, nextSettings);

	return c.json({
		data: normalizeStoredTemplateForResponse(existingTemplates[currentIndex]),
	});
});

app.delete("/templates/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const { id } = c.req.param();
	const settings = await loadOrganizationSettings(pool, user.organizationId);
	const existingTemplates = getStoredTemplates(settings);
	const nextTemplates = existingTemplates.filter(
		(template) => String(template.id) !== id,
	);

	if (nextTemplates.length === existingTemplates.length) {
		return c.json({ error: "Template nao encontrado" }, 404);
	}

	await saveOrganizationSettings(pool, user.organizationId, {
		...settings,
		whatsapp_templates: nextTemplates,
	});

	return c.json({ ok: true });
});

const parseMetadata = (value: unknown): Record<string, unknown> => {
	if (!value) return {};
	if (typeof value === "string") {
		try {
			return JSON.parse(value);
		} catch {
			return {};
		}
	}
	return value as Record<string, unknown>;
};

const toDateString = (value: unknown): string | null => {
	if (!value) return null;
	if (value instanceof Date) return value.toISOString().split("T")[0];
	if (typeof value === "string" && value.length >= 10) {
		return value.slice(0, 10);
	}
	return null;
};

app.get("/messages", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const { appointmentId, patientId, limit = "50" } = c.req.query();

	const conditions = ["organization_id = $1"];
	const params: unknown[] = [user.organizationId];
	if (patientId) {
		params.push(patientId);
		conditions.push(`patient_id = $${params.length}`);
	}
	if (appointmentId) {
		params.push(appointmentId);
		conditions.push(`metadata->>'appointment_id' = $${params.length}`);
	}

	params.push(Number(limit));

	const result = await pool.query(
		`
      SELECT id, patient_id, message, type, status, metadata, created_at, updated_at
      FROM whatsapp_messages
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `,
		params,
	);

	const rows = result.rows.map((row) => {
		const metadata = parseMetadata(row.metadata);
		return {
			id: row.id,
			appointment_id: metadata?.appointment_id ?? null,
			patient_id: row.patient_id,
			message_type: metadata?.message_type ?? row.type,
			message_content: row.message,
			status: row.status,
			sent_at: row.created_at?.toISOString?.() ?? null,
			delivered_at: metadata?.delivered_at ?? null,
			read_at: metadata?.read_at ?? null,
			response_received_at: metadata?.response_received_at ?? null,
			response_content: metadata?.response_content ?? null,
			metadata,
			created_at: row.created_at?.toISOString?.() ?? null,
			updated_at: row.updated_at?.toISOString?.() ?? null,
		};
	});

	return c.json({ data: rows });
});

app.get("/webhook-logs", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const { limit = "100" } = c.req.query();

	const result = await pool.query(
		`
      SELECT id, patient_id, message, type, status, metadata, created_at
      FROM whatsapp_messages
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
		[user.organizationId, Number(limit)],
	);

	const rows = result.rows.map((row) => {
		const metadata = parseMetadata(row.metadata);
		return {
			id: row.id,
			event_type: metadata.event_type ?? row.status ?? "message_updated",
			phone_number: metadata.to_phone ?? null,
			message_content: row.message ?? null,
			processed: metadata.processed ?? true,
			payload: metadata,
			created_at: row.created_at?.toISOString?.() ?? null,
			patient_id: row.patient_id ?? null,
		};
	});

	return c.json({ data: rows });
});

app.post("/messages", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		appointment_id?: string;
		patient_id?: string;
		message_type?: string;
		message_content: string;
		from_phone?: string;
		to_phone?: string;
		status?: string;
		metadata?: Record<string, unknown>;
	};

	if (!body.message_content) {
		return c.json({ error: "message_content is required" }, 400);
	}

	const result = await pool.query(
		`
      INSERT INTO whatsapp_messages (
        organization_id,
        patient_id,
        from_phone,
        to_phone,
        message,
        type,
        status,
        message_id,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
      RETURNING *
    `,
		[
			user.organizationId,
			body.patient_id ?? null,
			body.from_phone ?? "clinic",
			body.to_phone ?? "patient",
			body.message_content,
			body.message_type ?? "text",
			body.status ?? "sent",
			null,
			JSON.stringify({
				...body.metadata,
				appointment_id: body.appointment_id ?? null,
				message_type: body.message_type,
			}),
		],
	);

	const inserted = result.rows[0];
	return c.json(
		{
			data: {
				...inserted,
				metadata: parseMetadata(inserted.metadata),
			},
		},
		201,
	);
});

app.get("/pending-confirmations", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, "read");
	const { limit = "100" } = c.req.query();

	const today = new Date().toISOString().split("T")[0];

	try {
		const result = await db.execute(sql`
      SELECT a.id, a.patient_id, a.therapist_id, a.date, a.start_time, a.status,
             p.full_name, p.phone
      FROM (
        SELECT id, patient_id, therapist_id, date, start_time, status
        FROM appointments
        WHERE organization_id = ${user.organizationId}
          AND date >= ${today}
          AND status::text IN ('agendado', 'presenca_confirmada', 'scheduled', 'confirmed')
        ORDER BY date ASC, start_time ASC
        LIMIT ${Number(limit)}
      ) a
      LEFT JOIN patients p ON p.id = a.patient_id
    `);

		const rows = result.rows.map((row: any) => ({
			appointment_id: row.id,
			appointment_date: toDateString(row.date),
			appointment_time: row.start_time,
			confirmation_status: "pending",
			patient: row.patient_id
				? {
						id: row.patient_id,
						name: row.full_name ?? null,
						phone: row.phone ?? null,
					}
				: null,
			therapist_id: row.therapist_id,
		}));

		return c.json({ data: rows });
	} catch (error) {
		console.error("[WhatsApp] GET /pending-confirmations error:", error);
		return c.json({ error: "Failed to fetch pending confirmations" }, 500);
	}
});

export async function verifyMetaSignature(
	appSecret: string,
	rawBody: string,
	signature: string | undefined,
): Promise<boolean> {
	if (!signature || !signature.startsWith("sha256=")) return false;
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(appSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const expected = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(rawBody),
	);
	const expectedHex =
		"sha256=" +
		Array.from(new Uint8Array(expected))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	if (expectedHex.length !== signature.length) return false;
	let diff = 0;
	for (let i = 0; i < expectedHex.length; i++) {
		diff |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
	}
	return diff === 0;
}

app.post("/send-template", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		patient_id: string;
		template_key: string;
		variables: Record<string, string>;
		appointment_id?: string;
	};

	const { patient_id, template_key, variables, appointment_id } = body;
	if (!patient_id || !template_key) {
		return c.json({ error: "patient_id e template_key são obrigatórios" }, 400);
	}

	// 1. Buscar paciente para pegar o telefone
	const patientRes = await pool.query(
		"SELECT full_name, phone FROM patients WHERE id = $1 LIMIT 1",
		[patient_id],
	);
	const patient = patientRes.rows[0];
	if (!patient?.phone) {
		return c.json({ error: "Paciente não possui telefone cadastrado" }, 400);
	}

	// 2. Buscar template
	const settings = await loadOrganizationSettings(pool, user.organizationId);
	const templates = (settings.whatsapp_templates as any[]) ?? DEFAULT_TEMPLATES;
	const template = templates.find((t: any) => t.template_key === template_key);

	if (!template) {
		return c.json({ error: "Template não encontrado" }, 404);
	}

	// 3. Processar variáveis no conteúdo
	let content = template.content;
	for (const [key, val] of Object.entries(variables)) {
		content = content.replace(new RegExp(`{{${key}}}`, "g"), val);
	}

	// 4. Enviar via Meta API (Simulado ou Real dependendo das envs)
	const phoneId = c.env.WHATSAPP_PHONE_NUMBER_ID;
	const token = c.env.WHATSAPP_ACCESS_TOKEN;

	let status = "sent";
	let messageId = null;

	if (phoneId && token) {
		try {
			const metaRes = await fetch(
				`https://graph.facebook.com/v21.0/${phoneId}/messages`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						messaging_product: "whatsapp",
						to: patient.phone.replace(/\D/g, ""),
						type: "template",
						template: {
							name: template_key,
							language: { code: "pt_BR" },
							components: [
								{
									type: "body",
									parameters: template.variables.map((v: string) => ({
										type: "text",
										text: variables[v] || "",
									})),
								},
							],
						},
					}),
				},
			);
			const metaData = (await metaRes.json()) as any;
			messageId = metaData.messages?.[0]?.id;
		} catch (e) {
			console.error("[WhatsApp] Error sending Meta template:", e);
			status = "failed";
		}
	}

	// 5. Salvar na tabela de mensagens
	await pool.query(
		`INSERT INTO whatsapp_messages (
      organization_id, patient_id, from_phone, to_phone, message, type, status, message_id, metadata, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
		[
			user.organizationId,
			patient_id,
			"clinic",
			patient.phone,
			content,
			"template",
			status,
			messageId,
			JSON.stringify({ appointment_id, template_key, variables }),
		],
	);

	writeEvent(c.env, {
		orgId: user.organizationId,
		event: status === "sent" ? "whatsapp_sent" : "whatsapp_send_failed",
		route: `template:${template_key}`,
	});

	return c.json({ success: status === "sent", content, messageId });
});

// CRUD de automações persistidas
app.get("/automations", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	try {
		const result = await pool.query(
			`SELECT * FROM wa_automation_rules WHERE organization_id = $1 ORDER BY created_at DESC`,
			[user.organizationId],
		);
		return c.json({
			data: result.rows.map((r) => ({
				id: r.id,
				name: r.name,
				description: r.description,
				triggerType: r.trigger_type,
				conditions:
					typeof r.conditions === "string"
						? JSON.parse(r.conditions)
						: r.conditions,
				actions:
					typeof r.actions === "string" ? JSON.parse(r.actions) : r.actions,
				active: r.is_active,
				team: r.team,
				createdAt: r.created_at,
				updatedAt: r.updated_at,
			})),
		});
	} catch (err) {
		console.error("[WhatsApp] GET /automations error:", err);
		return c.json({ error: "Failed to fetch automations" }, 500);
	}
});

app.post("/automations", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		name: string;
		description?: string;
		triggerType: string;
		conditions: Record<string, unknown>;
		actions: Array<{ type: string; params: Record<string, unknown> }>;
		active?: boolean;
		team?: string;
	};

	if (!body.name || !body.triggerType) {
		return c.json({ error: "name and triggerType are required" }, 400);
	}

	try {
		const result = await pool.query(
			`INSERT INTO wa_automation_rules
       (organization_id, name, description, trigger_type, conditions, actions, is_active, team, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
			[
				user.organizationId,
				body.name,
				body.description ?? null,
				body.triggerType,
				JSON.stringify(body.conditions ?? {}),
				JSON.stringify(body.actions ?? []),
				body.active !== false,
				body.team ?? null,
				user.uid,
			],
		);
		const r = result.rows[0];
		return c.json(
			{
				data: {
					id: r.id,
					name: r.name,
					description: r.description,
					triggerType: r.trigger_type,
					conditions:
						typeof r.conditions === "string"
							? JSON.parse(r.conditions)
							: r.conditions,
					actions:
						typeof r.actions === "string" ? JSON.parse(r.actions) : r.actions,
					active: r.is_active,
					team: r.team,
					createdAt: r.created_at,
					updatedAt: r.updated_at,
				},
			},
			201,
		);
	} catch (err) {
		console.error("[WhatsApp] POST /automations error:", err);
		return c.json({ error: "Failed to create automation" }, 500);
	}
});

app.put("/automations/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as Partial<{
		name: string;
		description: string;
		triggerType: string;
		conditions: Record<string, unknown>;
		actions: Array<unknown>;
		active: boolean;
		team: string;
	}>;

	try {
		const sets: string[] = [];
		const params: unknown[] = [id, user.organizationId];
		let idx = 3;

		if (body.name !== undefined) {
			sets.push(`name = $${idx++}`);
			params.push(body.name);
		}
		if (body.description !== undefined) {
			sets.push(`description = $${idx++}`);
			params.push(body.description);
		}
		if (body.triggerType !== undefined) {
			sets.push(`trigger_type = $${idx++}`);
			params.push(body.triggerType);
		}
		if (body.conditions !== undefined) {
			sets.push(`conditions = $${idx++}`);
			params.push(JSON.stringify(body.conditions));
		}
		if (body.actions !== undefined) {
			sets.push(`actions = $${idx++}`);
			params.push(JSON.stringify(body.actions));
		}
		if (body.active !== undefined) {
			sets.push(`is_active = $${idx++}`);
			params.push(body.active);
		}
		if (body.team !== undefined) {
			sets.push(`team = $${idx++}`);
			params.push(body.team || null);
		}
		sets.push(`updated_at = NOW()`);

		if (sets.length === 1) return c.json({ error: "No fields to update" }, 400);

		const result = await pool.query(
			`UPDATE wa_automation_rules SET ${sets.join(", ")}
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
			params,
		);

		if (result.rows.length === 0)
			return c.json({ error: "Automation not found" }, 404);
		const r = result.rows[0];
		return c.json({
			data: {
				id: r.id,
				name: r.name,
				description: r.description,
				triggerType: r.trigger_type,
				conditions:
					typeof r.conditions === "string"
						? JSON.parse(r.conditions)
						: r.conditions,
				actions:
					typeof r.actions === "string" ? JSON.parse(r.actions) : r.actions,
				active: r.is_active,
				team: r.team,
				createdAt: r.created_at,
				updatedAt: r.updated_at,
			},
		});
	} catch (err) {
		console.error("[WhatsApp] PUT /automations/:id error:", err);
		return c.json({ error: "Failed to update automation" }, 500);
	}
});

app.delete("/automations/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	try {
		const result = await pool.query(
			`DELETE FROM wa_automation_rules WHERE id = $1 AND organization_id = $2 RETURNING id`,
			[id, user.organizationId],
		);
		if (result.rows.length === 0)
			return c.json({ error: "Automation not found" }, 404);
		return c.json({ data: { deleted: true } });
	} catch (err) {
		console.error("[WhatsApp] DELETE /automations/:id error:", err);
		return c.json({ error: "Failed to delete automation" }, 500);
	}
});

app.post("/templates", requireAuth, async (c) => {
	const user = c.get("user");
	const body = (await c.req.json()) as {
		name: string;
		category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
		language: string;
		headerText?: string;
		body: string;
		content?: string;
		status?: string;
		template_key?: string;
		variables?: string[];
		localOnly?: boolean;
		footer?: string;
		buttons?: Array<{
			type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
			text: string;
			url?: string;
			phone?: string;
		}>;
	};

	if (body.localOnly || body.content !== undefined) {
		const name = String(body.name ?? "").trim();
		const content = String(body.content ?? body.body ?? "").trim();

		if (!name || !content) {
			return c.json({ error: "name and content are required" }, 400);
		}

		const pool = await createPool(c.env);
		const settings = await loadOrganizationSettings(pool, user.organizationId);
		const existingTemplates = getStoredTemplates(settings);
		const now = new Date().toISOString();
		const templateKey = body.template_key?.trim() || slugifyTemplateKey(name);
		const newTemplate = {
			id: crypto.randomUUID(),
			organization_id: user.organizationId,
			name,
			template_key: templateKey,
			content,
			variables: body.variables ?? extractTemplateVariables(content),
			category: body.category || "general",
			status: body.status || "ativo",
			created_at: now,
			updated_at: now,
		};

		if (
			existingTemplates.some(
				(template) => String(template.template_key) === templateKey,
			)
		) {
			return c.json({ error: "Já existe um template com esta chave" }, 409);
		}

		const nextTemplates = [newTemplate, ...existingTemplates];

		await saveOrganizationSettings(pool, user.organizationId, {
			...settings,
			whatsapp_templates: nextTemplates,
		});

		return c.json({ data: normalizeStoredTemplateForResponse(newTemplate) }, 201);
	}

	if (!body.name || !body.category || !body.body) {
		return c.json({ error: "name, category and body are required" }, 400);
	}

	const phoneId = c.env.WHATSAPP_PHONE_NUMBER_ID;
	const token = c.env.WHATSAPP_ACCESS_TOKEN;

	if (!phoneId || !token) {
		return c.json({ error: "WhatsApp credentials not configured" }, 503);
	}

	const components: Record<string, unknown>[] = [];

	if (body.headerText) {
		components.push({ type: "HEADER", format: "TEXT", text: body.headerText });
	}

	components.push({ type: "BODY", text: body.body });

	if (body.footer) {
		components.push({ type: "FOOTER", text: body.footer });
	}

	if (body.buttons?.length) {
		components.push({
			type: "BUTTONS",
			buttons: body.buttons.map((btn) => {
				if (btn.type === "QUICK_REPLY")
					return { type: "QUICK_REPLY", text: btn.text };
				if (btn.type === "URL")
					return { type: "URL", text: btn.text, url: btn.url };
				return { type: "PHONE_NUMBER", text: btn.text, phone_number: btn.phone };
			}),
		});
	}

	try {
		const pool = await createPool(c.env);
		const settings = await pool.query(
			`SELECT settings FROM organizations WHERE id = $1 LIMIT 1`,
			[user.organizationId],
		);
		const wabaId = (
			settings.rows[0]?.settings as Record<string, unknown> | null
		)?.whatsapp_business_account_id as string | undefined;

		const targetId = wabaId || phoneId;

		const metaRes = await fetch(
			`https://graph.facebook.com/v21.0/${targetId}/message_templates`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					name: body.name.toLowerCase().replace(/\s+/g, "_"),
					category: body.category,
					language: body.language || "pt_BR",
					components,
				}),
			},
		);

		const metaData = (await metaRes.json()) as Record<string, unknown>;

		if (!metaRes.ok) {
			const metaError = metaData.error as
				| { message?: string }
				| undefined;
			return c.json(
				{
					error:
						metaError?.message || "Failed to create template on Meta",
					details: metaData,
				},
				metaRes.status as 400 | 401 | 403 | 404 | 422 | 500,
			);
		}

		return c.json({ data: metaData }, 201);
	} catch (err) {
		console.error("[WhatsApp] POST /templates error:", err);
		return c.json({ error: "Failed to create template" }, 500);
	}
});

app.post("/templates/sync", requireAuth, async (c) => {
	const user = c.get("user");
	const phoneId = c.env.WHATSAPP_PHONE_NUMBER_ID;
	const token = c.env.WHATSAPP_ACCESS_TOKEN;

	if (!phoneId || !token) {
		return c.json({ error: "WhatsApp credentials not configured" }, 503);
	}

	try {
		const pool = await createPool(c.env);
		const settingsRes = await pool.query(
			`SELECT settings FROM organizations WHERE id = $1 LIMIT 1`,
			[user.organizationId],
		);
		const settings = settingsRes.rows[0]?.settings as Record<string, any> || {};
		const wabaId = settings.whatsapp_business_account_id as string | undefined;
		const targetId = wabaId || phoneId;

		const metaRes = await fetch(
			`https://graph.facebook.com/v22.0/${targetId}/message_templates`,
			{
				headers: { Authorization: `Bearer ${token}` },
			},
		);

		if (!metaRes.ok) {
			const error = await metaRes.json();
			return c.json({ error: "Failed to fetch from Meta", details: error }, 502);
		}

		const metaData = (await metaRes.json()) as { data: any[] };
		const localTemplates = settings.whatsapp_templates || [];

		// Atualizar status dos locais com base nos da Meta
		const updatedTemplates = localTemplates.map((local: any) => {
			const meta = metaData.data.find((m) => m.name === local.name);
			if (meta) {
				return {
					...local,
					status: meta.status, // APPROVED, REJECTED, PENDING
					category: meta.category,
					components: meta.components,
					last_sync: new Date().toISOString(),
				};
			}
			return local;
		});

		// Adicionar templates da Meta que não existem localmente
		for (const meta of metaData.data) {
			if (!localTemplates.some((l: any) => l.name === meta.name)) {
				updatedTemplates.push({
					id: crypto.randomUUID(),
					name: meta.name,
					status: meta.status,
					category: meta.category,
					language: meta.language,
					components: meta.components,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				});
			}
		}

		await pool.query(
			`UPDATE organizations SET settings = $1::jsonb WHERE id = $2`,
			[JSON.stringify({ ...settings, whatsapp_templates: updatedTemplates }), user.organizationId]
		);

		return c.json({ data: { synced: metaData.data.length } });
	} catch (err) {
		console.error("[WhatsApp] POST /templates/sync error:", err);
		return c.json({ error: "Sync failed" }, 500);
	}
});

export { app as whatsappRoutes };
