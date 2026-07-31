import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import {
  detectPlateaus,
  PLATEAU_MIN_SESSIONS,
  PAIN_MCID_POINTS,
} from "../../lib/clinical/plateauDetection";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/clinical/plateau
 *
 * Pacientes cuja conduta se repete há N sessões sem progressão.
 *
 * Não classifica o platô — devolve os sinais e deixa a decisão com o
 * fisioterapeuta, porque distinguir máximo funcional de platô temporário exige
 * exame e conversa com o paciente, não estatística. O valor está em fazer a
 * pergunta aparecer; o desfecho ruim é ninguém perceber e seguir igual.
 */
app.get("/plateau", requireAuth, async (c) => {
  const user = c.get("user");
  const minSessions = Number(c.req.query("minSessions") || PLATEAU_MIN_SESSIONS);
  const limit = Number(c.req.query("limit") || 50);

  try {
    const signals = await detectPlateaus(c.env, {
      organizationId: user.organizationId,
      minSessions: Number.isFinite(minSessions) ? minSessions : PLATEAU_MIN_SESSIONS,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return c.json({
      data: signals,
      meta: {
        minSessions: PLATEAU_MIN_SESSIONS,
        painMcidPoints: PAIN_MCID_POINTS,
        // A UI precisa dizer ao profissional de onde vêm os limiares, senão o
        // alerta parece arbitrário e é ignorado.
        criterios: {
          conduta: `${PLATEAU_MIN_SESSIONS} sessões consecutivas com a mesma conduta e região (acima do p95 do histórico da clínica)`,
          dor: `variação de dor menor que ${PAIN_MCID_POINTS} ponto na EVA (MCID, Salaffi et al. 2004)`,
          carga: "nenhuma variação de carga em kg no período",
        },
      },
    });
  } catch (error: any) {
    console.error("[Clinical/Plateau] erro:", error);
    return c.json({ error: "Falha ao detectar platôs", details: error.message }, 500);
  }
});

export default app;
