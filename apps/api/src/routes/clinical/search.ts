import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { hybridClinicalSearch } from "../../lib/ai/hybridClinicalSearch";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/clinical/search?q=&patientId=&limit=
 *
 * Busca híbrida no histórico clínico. `patientId` restringe ao prontuário de um
 * paciente — obrigatório para uso clínico individual. Sem ele, a busca é
 * populacional e devolve o paciente de cada resultado, para que o profissional
 * abra o prontuário pela via normal (com as permissões dela).
 */
app.get("/search", requireAuth, async (c) => {
  const user = c.get("user");
  const q = c.req.query("q") ?? "";
  const patientId = c.req.query("patientId") ?? null;
  const limit = Number(c.req.query("limit") || 10);

  try {
    const hits = await hybridClinicalSearch(c.env, {
      organizationId: user.organizationId,
      query: q,
      patientId,
      limit: Number.isFinite(limit) ? limit : 10,
    });

    return c.json({
      data: hits,
      meta: {
        escopo: patientId ? "paciente" : "organizacao",
        // Explicita de onde veio cada resultado: achado só pelo léxico costuma
        // ser jargão local (TFS, IQT), só pelo vetor costuma ser paráfrase.
        fusao: "Reciprocal Rank Fusion entre full-text em português e similaridade vetorial",
      },
    });
  } catch (error: any) {
    console.error("[Clinical/Search] erro:", error);
    return c.json({ error: "Falha na busca clínica", details: error.message }, 500);
  }
});

export default app;
