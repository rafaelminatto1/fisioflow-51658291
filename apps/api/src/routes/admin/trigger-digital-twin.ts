import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth, requireRole } from "../../lib/auth";
import { createDb } from "../../lib/db";
import { patients } from "@fisioflow/db";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * POST /api/admin/trigger-digital-twin
 * Dispara o workflow de análise para todos os pacientes ativos da organização.
 * Body opcional: { dryRun?: boolean } — se true, apenas lista pacientes sem disparar.
 */
app.use("*", requireAuth);
app.use("*", requireRole("admin"));

const triggerSchema = z.object({
  dryRun: z.boolean().optional().default(false),
});

app.post("/", zValidator("json", triggerSchema), async (c) => {
  const user = c.get("user");
  const { dryRun } = c.req.valid("json");
  const db = createDb(c.env, "read");

  try {
    const activePatients = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.organizationId, user.organizationId));

    console.log(`[Admin/DigitalTwin] Triggering analysis for ${activePatients.length} patients`);

    if (dryRun) {
      return c.json({
        success: true,
        dryRun: true,
        patientCount: activePatients.length,
        patientIds: activePatients.map((p) => p.id),
      });
    }

    if (!c.env.WORKFLOW_DIGITAL_TWIN) {
      return c.json({ error: "Workflow binding missing" }, 500);
    }

    const workflow = c.env.WORKFLOW_DIGITAL_TWIN;

    c.executionCtx.waitUntil(
      (async () => {
        for (const p of activePatients) {
          try {
            await workflow.create({
              id: `dt-${p.id}-${Date.now()}`,
              params: { patientId: p.id },
            });
          } catch (e) {
            console.error(`[Admin/DigitalTwin] Failed for ${p.id}:`, e);
          }
        }
      })(),
    );

    return c.json({
      success: true,
      message: `Análise iniciada para ${activePatients.length} pacientes.`,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export { app as triggerDigitalTwinRoutes };
