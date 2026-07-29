import { Hono } from "hono";
import type { Env } from "../types/env";
import type { AuthVariables } from "../lib/auth";
import { settingsRoutes } from "./scheduling-settings";
import { recurringRoutes } from "./scheduling-recurring";
import { appointmentWaitlistRoutes } from "./appointment-waitlist";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// settingsRoutes e recurringRoutes já definem os caminhos completos
// (/settings/*, /capacity-config, /recurring-series, /appointment-types), então
// montam na RAIZ. Montar em /settings ou /recurring duplicava o prefixo e gerava
// 404 (o front chama /api/scheduling/settings/* e /api/scheduling/recurring-series).
app.route("/", settingsRoutes);
app.route("/", recurringRoutes);
app.route("/appointment-waitlist", appointmentWaitlistRoutes);

export { app as schedulingRoutes };
