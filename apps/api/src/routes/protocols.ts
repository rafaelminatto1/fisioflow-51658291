/**
 * Rotas: Protocolos Clínicos
 * GET    /api/protocols          — lista com filtros
 * GET    /api/protocols/:id      — detalhe com exercícios
 * POST   /api/protocols          — criar protocolo (auth)
 * PUT    /api/protocols/:id      — atualizar protocolo (auth)
 * DELETE /api/protocols/:id      — excluir protocolo (auth)
 */

import { exerciseProtocols, protocolExercises } from "@fisioflow/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { type AuthVariables, requireAuth } from "../lib/auth";
import { createDb } from "../lib/db";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== LISTA DE PROTOCOLOS =====
app.get("/", async (c) => {
	const {
		q,
		type,
		evidenceLevel,
		icd10,
		page = "1",
		limit = "20",
		professionalId,
	} = c.req.query();

	const db = await createDb(c.env);
	const pageNum = Math.max(1, parseInt(page));
	const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
	const offset = (pageNum - 1) * limitNum;

	// Sempre filtra isActive. Mostra protocolos públicos OU criados por este profissional.
	const visibilityCondition = professionalId
		? or(
				eq(exerciseProtocols.isPublic, true),
				eq(exerciseProtocols.createdBy, professionalId),
			)
		: eq(exerciseProtocols.isPublic, true);

	const conditions = [
		eq(exerciseProtocols.isActive, true),
		visibilityCondition,
	];

	if (q) conditions.push(ilike(exerciseProtocols.name, `%${q}%`));
	if (type) {
		conditions.push(
			eq(
				exerciseProtocols.protocolType,
				type as
					| "pos_operatorio"
					| "patologia"
					| "preventivo"
					| "esportivo"
					| "funcional"
					| "neurologico"
					| "respiratorio",
			),
		);
	}
	if (evidenceLevel) {
		conditions.push(
			eq(
				exerciseProtocols.evidenceLevel,
				evidenceLevel as "A" | "B" | "C" | "D",
			),
		);
	}

	const where = and(...conditions);

	const [rows, countResult] = await Promise.all([
		db
			.select({
				id: exerciseProtocols.id,
				slug: exerciseProtocols.slug,
				name: exerciseProtocols.name,
				conditionName: exerciseProtocols.conditionName,
				protocolType: exerciseProtocols.protocolType,
				evidenceLevel: exerciseProtocols.evidenceLevel,
				description: exerciseProtocols.description,
				weeksTotal: exerciseProtocols.weeksTotal,
				tags: exerciseProtocols.tags,
				icd10Codes: exerciseProtocols.icd10Codes,
				milestones: exerciseProtocols.milestones,
				restrictions: exerciseProtocols.restrictions,
				phases: exerciseProtocols.phases,
				createdAt: exerciseProtocols.createdAt,
				createdBy: exerciseProtocols.createdBy,
			})
			.from(exerciseProtocols)
			.where(where)
			.orderBy(exerciseProtocols.name)
			.limit(limitNum)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(exerciseProtocols)
			.where(where),
	]);

	console.log("[Protocols API] Returning:", {
		page: pageNum,
		limit: limitNum,
		returnedCount: rows.length,
		totalCount: Number(countResult[0]?.count ?? 0),
		conditions: conditions.map((c) => c.toString()),
	});

	return c.json({
		data: rows,
		meta: {
			page: pageNum,
			limit: limitNum,
			total: Number(countResult[0]?.count ?? 0),
			pages: Math.ceil(Number(countResult[0]?.count ?? 0) / limitNum),
		},
	});
});

// ===== DETALHE DO PROTOCOLO =====
app.get("/:id", async (c) => {
	const db = await createDb(c.env);
	const { id } = c.req.param();

	const isUuid = /^[0-9a-f-]{36}$/i.test(id);
	const condition = isUuid
		? eq(exerciseProtocols.id, id)
		: eq(exerciseProtocols.slug, id);

	const [protocol, protocolExs] = await Promise.all([
		db
			.select()
			.from(exerciseProtocols)
			.where(
				and(
					condition,
					eq(exerciseProtocols.isActive, true),
					eq(exerciseProtocols.isPublic, true),
				),
			)
			.limit(1),
		db
			.select()
			.from(protocolExercises)
			.where(
				// Join lazy: buscamos depois pelo protocolId
				sql`${protocolExercises.protocolId} = (
          SELECT id FROM exercise_protocols WHERE ${
						isUuid ? sql`id = ${id}` : sql`slug = ${id}`
					} LIMIT 1
        )`,
			)
			.orderBy(protocolExercises.phaseWeekStart, protocolExercises.orderIndex),
	]);

	if (!protocol.length)
		return c.json({ error: "Protocolo não encontrado" }, 404);

	return c.json({
		data: {
			...protocol[0],
			protocolExercises: protocolExs,
		},
	});
});

// ===== CRIAR PROTOCOLO (AUTH) =====
app.post("/", requireAuth, async (c) => {
	const user = c.get("user");
	const db = await createDb(c.env);
	const body = await c.req.json();

	// Gerar slug a partir do nome
	const slug = body.name
		?.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");

	const [created] = await db
		.insert(exerciseProtocols)
		.values({
			name: body.name,
			slug: slug || undefined,
			conditionName: body.conditionName,
			protocolType: body.protocolType,
			evidenceLevel: body.evidenceLevel,
			description: body.description,
			objectives: body.objectives,
			contraindications: body.contraindications,
			weeksTotal: body.weeksTotal,
			phases: body.phases ?? [],
			milestones: body.milestones ?? [],
			restrictions: body.restrictions ?? [],
			progressionCriteria: body.progressionCriteria ?? [],
			references: body.references ?? [],
			icd10Codes: body.icd10Codes ?? [],
			tags: body.tags ?? [],
			clinicalTests: body.clinicalTests ?? [],
			isPublic: body.isPublic ?? true,
			organizationId: user.organizationId ?? null,
			createdBy: user.uid,
		})
		.returning();

	return c.json({ data: created }, 201);
});

// ===== ATUALIZAR PROTOCOLO (AUTH) =====
app.put("/:id", requireAuth, async (c) => {
	const db = await createDb(c.env);
	const { id } = c.req.param();
	const body = await c.req.json();

	// Campos permitidos para atualização
	const updateData: Record<string, unknown> = {};
	const allowedFields = [
		"name",
		"conditionName",
		"protocolType",
		"evidenceLevel",
		"description",
		"objectives",
		"contraindications",
		"weeksTotal",
		"phases",
		"milestones",
		"restrictions",
		"progressionCriteria",
		"references",
		"icd10Codes",
		"tags",
		"clinicalTests",
		"isPublic",
	];

	for (const field of allowedFields) {
		if (body[field] !== undefined) {
			updateData[field] = body[field];
		}
	}

	// Regenerar slug se nome mudou
	if (body.name) {
		updateData.slug = body.name
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");
	}

	updateData.updatedAt = new Date();

	const [updated] = await db
		.update(exerciseProtocols)
		.set(updateData)
		.where(eq(exerciseProtocols.id, id))
		.returning();

	if (!updated) return c.json({ error: "Protocolo não encontrado" }, 404);

	return c.json({ data: updated });
});

// ===== EXCLUIR PROTOCOLO (AUTH, soft-delete) =====
app.delete("/:id", requireAuth, async (c) => {
	const db = await createDb(c.env);
	const { id } = c.req.param();

	const [deleted] = await db
		.update(exerciseProtocols)
		.set({ isActive: false, updatedAt: new Date() })
		.where(eq(exerciseProtocols.id, id))
		.returning({ id: exerciseProtocols.id });

	if (!deleted) return c.json({ error: "Protocolo não encontrado" }, 404);

	return c.json({ success: true });
});

export { app as protocolsRoutes };
