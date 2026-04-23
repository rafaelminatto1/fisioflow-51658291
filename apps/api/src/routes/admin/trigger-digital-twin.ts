import { Hono } from "hono";
import type { Env } from "../types/env";
import type { AuthVariables } from "../lib/auth";
import { requireAuth } from "../lib/auth";
import { createDb } from "../lib/db";
import { patients } from "@fisioflow/db";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * POST /api/admin/trigger-digital-twin
 * Dispara o workflow de análise para todos os pacientes ativos da organização.
 */
app.post("/", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, 'read');

	try {
		// 1. Buscar todos os pacientes ativos
		const activePatients = await db.select({ id: patients.id })
			.from(patients)
			.where(eq(patients.organizationId, user.organizationId));

		console.log(`[Admin/DigitalTwin] Triggering analysis for ${activePatients.length} patients`);

		// 2. Disparar workflow para cada um (em background)
		c.executionCtx.waitUntil((async () => {
			for (const p of activePatients) {
				try {
					await c.env.WORKFLOW_DIGITAL_TWIN.create({
						id: `dt-${p.id}-${Date.now()}`,
						params: { patientId: p.id }
					});
				} catch (e) {
					console.error(`[Admin/DigitalTwin] Failed for ${p.id}:`, e);
				}
			}
		})());

		return c.json({
			success: true,
			message: `Análise iniciada para ${activePatients.length} pacientes.`,
		});
	} catch (error: any) {
		return c.json({ error: error.message }, 500);
	}
});

export { app as triggerDigitalTwinRoutes };
