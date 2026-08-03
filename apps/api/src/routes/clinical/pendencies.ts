import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import {
  listAppointmentPendencies,
  MAX_RANGE_DAYS,
  PENDENCY_LABELS,
  PLATEAU_RECENT_DAYS,
} from "../../lib/clinical/appointmentPendencies";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/clinical/appointments/pendencias?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Pendências clínicas de todos os agendamentos da janela, em uma consulta só.
 * A agenda carrega uma semana inteira; uma chamada por card derrubaria a tela.
 */
app.get("/appointments/pendencias", requireAuth, async (c) => {
  const user = c.get("user");
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) {
    return c.json({ error: "from e to são obrigatórios (YYYY-MM-DD)" }, 400);
  }

  try {
    const report = await listAppointmentPendencies(c.env, {
      organizationId: user.organizationId,
      from,
      to,
    });

    return c.json({
      data: report.byAppointment,
      meta: {
        from,
        to,
        // Denominador junto do numerador: badge sem denominador não é auditável.
        totalAppointments: report.totalAppointments,
        counts: report.counts,
        criterios: {
          semEvolucao: PENDENCY_LABELS.sem_evolucao.criterio,
          plato: PENDENCY_LABELS.plato.criterio,
        },
        plateauRecentDays: PLATEAU_RECENT_DAYS,
      },
    });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    // Erro de intervalo é do cliente, não do servidor.
    if (
      message.includes("YYYY-MM-DD") ||
      message.includes("posterior") ||
      message.includes("intervalo máximo")
    ) {
      return c.json({ error: message, maxRangeDays: MAX_RANGE_DAYS }, 400);
    }
    console.error("[Clinical/Pendencias] erro:", error);
    return c.json({ error: "Falha ao apurar pendências", details: message }, 500);
  }
});

export default app;
