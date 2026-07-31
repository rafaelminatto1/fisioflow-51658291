import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { listDischargeCandidates } from "../../lib/clinical/dischargeCandidates";
import {
  DISCHARGE_REASONS,
  DISCHARGE_REASON_LABELS,
  listPatientDischarges,
  outcomeBreakdown,
  recordDischarge,
  suggestDischargeContent,
} from "../../lib/clinical/dischargeService";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const dischargeSchema = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid().nullish(),
  dischargedAt: z.string().date().nullish(),
  reason: z.enum(DISCHARGE_REASONS),
  /** Preenchido = alta parcial: o tratamento continua para outras regiões. */
  scope: z.string().max(120).nullish(),
  baselineSummary: z.string().max(2000).nullish(),
  finalSummary: z.string().max(2000).nullish(),
  painInitial: z.number().int().min(0).max(10).nullish(),
  painFinal: z.number().int().min(0).max(10).nullish(),
  maintenancePlan: z.string().max(4000).nullish(),
  returnCriteria: z.string().max(2000).nullish(),
  reviewDate: z.string().date().nullish(),
  notes: z.string().max(2000).nullish(),
});

/**
 * GET /api/clinical/discharge/reasons
 * Taxonomia com rótulos. `abandono` não está aqui de propósito: é sempre
 * inferido por inatividade, nunca declarado.
 */
app.get("/discharge/reasons", requireAuth, (c) =>
  c.json({
    data: DISCHARGE_REASONS.map((value) => ({ value, label: DISCHARGE_REASON_LABELS[value] })),
  }),
);

/**
 * GET /api/clinical/discharge/suggestion?patientId=...
 * Pré-preenchimento do bloco de alta com linha de base e EVA já extraídos.
 */
app.get("/discharge/suggestion", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.query("patientId");
  if (!patientId) return c.json({ error: "patientId é obrigatório" }, 400);

  try {
    const data = await suggestDischargeContent(c.env, {
      organizationId: user.organizationId,
      patientId,
    });
    return c.json({ data });
  } catch (error: any) {
    console.error("[Clinical/Discharge] suggestion:", error);
    return c.json({ error: "Falha ao montar sugestão", details: error.message }, 500);
  }
});

/** GET /api/clinical/discharge?patientId=... */
app.get("/discharge", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.query("patientId");
  if (!patientId) return c.json({ error: "patientId é obrigatório" }, 400);

  try {
    const data = await listPatientDischarges(c.env, {
      organizationId: user.organizationId,
      patientId,
    });
    return c.json({ data });
  } catch (error: any) {
    console.error("[Clinical/Discharge] list:", error);
    return c.json({ error: "Falha ao listar altas", details: error.message }, 500);
  }
});

/** POST /api/clinical/discharge */
app.post("/discharge", requireAuth, zValidator("json", dischargeSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  try {
    const row = await recordDischarge(c.env, {
      ...body,
      organizationId: user.organizationId,
      origin: "profissional",
      // `profileId` é o UUID do profissional; `uid` é o id textual do Better Auth.
      createdBy: user.profileId ?? null,
    });
    return c.json({ data: row }, 201);
  } catch (error: any) {
    console.error("[Clinical/Discharge] record:", error);
    return c.json({ error: "Falha ao registrar alta", details: error.message }, 500);
  }
});

/**
 * GET /api/clinical/discharge/candidates
 *
 * Fila para a recepção confirmar por telefone quem recebeu alta e quem abandonou.
 * NÃO é inferência: nenhum candidato vira alta sem alguém confirmar. Inferir
 * desfecho por inatividade reproduziria o viés de seleção já descartado na
 * atribuição de autoria.
 */
app.get("/discharge/candidates", requireAuth, async (c) => {
  const user = c.get("user");
  const minInactiveDays = Number(c.req.query("minInactiveDays") || 90);
  const limit = Number(c.req.query("limit") || 50);
  const offset = Number(c.req.query("offset") || 0);

  try {
    const result = await listDischargeCandidates(c.env, {
      organizationId: user.organizationId,
      minInactiveDays: Number.isFinite(minInactiveDays) ? minInactiveDays : 90,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    });

    return c.json({
      data: result.candidates,
      meta: {
        total: result.total,
        semTelefone: result.semTelefone,
        aviso:
          "Lista de trabalho para confirmação por telefone. Nenhum paciente aqui recebeu alta — só é alta depois que alguém confirmar com ele.",
      },
    });
  } catch (error: any) {
    console.error("[Clinical/Discharge] candidates:", error);
    return c.json({ error: "Falha ao listar candidatos", details: error.message }, 500);
  }
});

/**
 * POST /api/clinical/discharge/candidates/:patientId/confirm
 * A recepção confirmou com o paciente. Só aqui o candidato vira alta.
 */
app.post(
  "/discharge/candidates/:patientId/confirm",
  requireAuth,
  zValidator(
    "json",
    z.object({
      reason: z.enum(DISCHARGE_REASONS),
      dischargedAt: z.string().date().nullish(),
      notes: z.string().max(2000).nullish(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const patientId = c.req.param("patientId");
    const body = c.req.valid("json");

    try {
      const row = await recordDischarge(c.env, {
        organizationId: user.organizationId,
        patientId,
        reason: body.reason,
        dischargedAt: body.dischargedAt ?? null,
        notes: body.notes ?? null,
        origin: "retroativo",
        createdBy: user.profileId ?? null,
      });
      return c.json({ data: row }, 201);
    } catch (error: any) {
      console.error("[Clinical/Discharge] confirm:", error);
      return c.json({ error: "Falha ao confirmar alta", details: error.message }, 500);
    }
  },
);

/**
 * GET /api/clinical/discharge/outcomes
 * Decomposição de desfecho para gestão.
 */
app.get("/discharge/outcomes", requireAuth, async (c) => {
  const user = c.get("user");
  const inactiveDays = Number(c.req.query("inactiveDays") || 90);

  try {
    const data = await outcomeBreakdown(c.env, {
      organizationId: user.organizationId,
      inactiveDays: Number.isFinite(inactiveDays) ? inactiveDays : 90,
    });
    return c.json({
      data,
      meta: {
        // Sem este aviso o indicador é lido como piora e morre na primeira
        // reunião. A literatura mostra 30–38% de alta formal mesmo em serviço
        // estruturado, e a taxa CAI quando os critérios ficam objetivos.
        aviso:
          "A taxa de alta declarada começa baixa por construção: o registro formal só existe a partir de agora. Números anteriores refletem ausência de registro, não ausência de alta.",
      },
    });
  } catch (error: any) {
    console.error("[Clinical/Discharge] outcomes:", error);
    return c.json({ error: "Falha ao calcular desfechos", details: error.message }, 500);
  }
});

export default app;
